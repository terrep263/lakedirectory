import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
async function verify() {
  try {
    const businesses = await prisma.businessCore.findMany({
      where: { isFeatured: true },
      select: { id: true, name: true, primaryImagePath: true }
    })
    
    console.log('\n=== Featured Businesses Image Paths ===\n')
    
    for (const business of businesses) {
      const imagePath = business.primaryImagePath
      const fullPath = path.join(process.cwd(), 'public', imagePath?.replace(/^\//, '') || '')
      const exists = imagePath && fs.existsSync(fullPath)
      
      console.log(`${business.name}`)
      console.log(`  Path: ${imagePath || 'NONE'}`)
      console.log(`  File Exists: ${exists ? '✓ YES' : '✗ NO'}`)
      console.log()
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
