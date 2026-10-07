import Reveal from './Reveal'

/** Simple section title, without decorative terminal labels or captions. */
export default function SectionHeading({
  title,
  align = 'left',
}: {
  title: string
  align?: 'left' | 'center'
}) {
  return (
    <Reveal className={align === 'center' ? 'text-center' : ''}>
      <h2 className="display text-3xl text-gradient sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
    </Reveal>
  )
}
