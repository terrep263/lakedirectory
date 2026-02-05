#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

console.log('\n='.repeat(80))
console.log('ENFORCEMENT TESTING SUITE - Schema v2 Invariant Verification')
console.log('='.repeat(80))
console.log('\nStarting Next.js server for API testing...\n')

const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, NODE_ENV: 'test' } // Set NODE_ENV for server too
})

let serverReady = false

serverProcess.stdout.on('data', (data) => {
  const output = data.toString()
  if (output.includes('Ready in') || output.includes('Local:')) {
    if (!serverReady) {
      serverReady = true
      console.log('✓ Server ready\n')
      runTests()
    }
  }
})

serverProcess.stderr.on('data', (data) => {
  const output = data.toString()
  if (output.includes('Error')) {
    console.error('Server Error:', output)
  }
})

function runTests() {
  console.log('Running enforcement test suite...\n')
  
  const jestProcess = spawn('npx', ['jest', '--config=jest.config.js', '--runInBand', '--verbose', '--detectOpenHandles'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'test' } // Explicitly set NODE_ENV for tests
  })

  jestProcess.on('close', (code) => {
    console.log('\n' + '='.repeat(80))
    if (code === 0) {
      console.log('✓ ALL ENFORCEMENT TESTS PASSED')
      console.log('✓ Schema v2 invariants verified')
      console.log('✓ Layer 1 complete and locked')
    } else {
      console.log('✗ ENFORCEMENT TESTS FAILED')
      console.log('✗ Invariant violations detected')
      console.log('✗ Review failures above')
    }
    console.log('='.repeat(80) + '\n')
    
    // Gracefully shutdown server
    console.log('Shutting down server...')
    
    // Give Jest a moment to fully clean up
    setTimeout(() => {
      serverProcess.kill('SIGTERM')
      
      // Force kill after 3 seconds if not closed
      setTimeout(() => {
        try {
          serverProcess.kill('SIGKILL')
        } catch (e) {
          // Process already dead
        }
        process.exit(code)
      }, 3000)
    }, 500)
  })

  jestProcess.on('error', (err) => {
    console.error('Jest process error:', err)
    serverProcess.kill('SIGKILL')
    process.exit(1)
  })
}

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down...')
  serverProcess.kill('SIGTERM')
  setTimeout(() => {
    serverProcess.kill('SIGKILL')
    process.exit(1)
  }, 1000)
})

setTimeout(() => {
  if (!serverReady) {
    console.error('✗ Server failed to start within timeout')
    serverProcess.kill()
    process.exit(1)
  }
}, 30000)
