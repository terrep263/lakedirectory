import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter countyName="Lake County" state="Florida" />
    </div>
  )
}

