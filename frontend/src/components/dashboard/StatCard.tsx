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
    <article className="rounded-xl border border-[#B88736]/20 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold text-[#4B1020]">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-[#FAF5EB] p-3 text-[#760D2D]">
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {description}
      </p>
    </article>
  )
}