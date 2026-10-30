import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  title: string
  value: string
  description: string
  icon: LucideIcon
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="min-w-0 rounded-xl border border-[#B88736]/20 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-5 text-gray-500 sm:text-sm">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-semibold leading-tight text-[#4B1020] sm:mt-3 sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="shrink-0 rounded-lg bg-[#FAF5EB] p-2.5 text-[#760D2D] sm:rounded-xl sm:p-3">
          <Icon size={21} className="sm:hidden" />
          <Icon size={23} className="hidden sm:block" />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-gray-500 sm:mt-4">
        {description}
      </p>
    </article>
  )
}