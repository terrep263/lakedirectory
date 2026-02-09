import { runWeeklyArticleGenerator } from '@/lib/ai-blog-generator'
import { redirect } from 'next/navigation'

export default function AdminBlogGeneratePage() {
  async function generateArticle() {
    'use server'
    
    try {
      await runWeeklyArticleGenerator()
    } catch (error) {
      console.error('Error generating article:', error)
    }
    
    redirect('/admin/blog')
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg bg-white shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            🤖 AI Blog Generator
          </h1>
          
          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              How It Works
            </h2>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✅ Automatically selects unfeatured businesses</li>
              <li>✅ Chooses article type (spotlight, city guide, roundup, etc.)</li>
              <li>✅ Uses OpenAI GPT-4 to write newspaper-style article</li>
              <li>✅ Generates SEO-optimized title and excerpt</li>
              <li>✅ Auto-publishes to /blog</li>
              <li>✅ Runs automatically Mon/Wed/Fri at 6:00 AM</li>
            </ul>
          </div>

          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <h2 className="text-lg font-semibold text-amber-900 mb-2">
              ⚠️ Requirements
            </h2>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• OpenAI API key in .env.local (OPENAI_API_KEY)</li>
              <li>• BlogPost table in database</li>
              <li>• Active businesses in directory</li>
            </ul>
          </div>

          <form action={generateArticle}>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Generate Article Now (Manual Test)
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600 text-center">
            This will generate and publish one article immediately.
            <br />
            Check console for detailed logs.
          </p>
        </div>
      </div>
    </div>
  )
}
