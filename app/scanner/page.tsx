'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Html5Qrcode } from 'html5-qrcode'
import styles from './scanner.module.css'

type ScanState = 'idle' | 'processing' | 'success' | 'error'

export default function ScannerPage() {
  const router = useRouter()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [message, setMessage] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const name = localStorage.getItem('business_name') || 'Business'
    setBusinessName(name)

    const qrCodeScanner = new Html5Qrcode('qr-reader')
    setHtml5QrCode(qrCodeScanner)

    return () => {
      if (qrCodeScanner.isScanning) {
        qrCodeScanner.stop().catch(() => {})
      }
    }
  }, [router])

  const startScanning = async () => {
    if (!html5QrCode) return

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          await html5QrCode.stop()
          await handleScan(decodedText)
        },
        () => {}
      )
    } catch (err) {
      setMessage('Camera access denied')
      setScanState('error')
    }
  }

  const handleScan = async (qrToken: string) => {
    setScanState('processing')
    setMessage('Processing...')

    try {
      const token = localStorage.getItem('auth_token')
      
      const response = await fetch('/api/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ qrToken })
      })

      const data = await response.json()

      if (data.success && data.redeemed) {
        setScanState('success')
        setMessage('Voucher redeemed — proceed with order')
      } else {
        setScanState('error')
        setMessage(data.error || 'Redemption failed')
      }
    } catch (err) {
      setScanState('error')
      setMessage('Network error — cannot verify voucher')
    }

    setTimeout(() => {
      resetScanner()
    }, 3000)
  }

  const resetScanner = () => {
    setScanState('idle')
    setMessage('')
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('business_name')
    router.push('/login')
  }

  if (scanState === 'success') {
    return (
      <div className={styles.fullscreen} style={{ background: '#10b981' }}>
        <div className={styles.statusContent}>
          <div className={styles.checkmark}>✓</div>
          <h1 className={styles.statusTitle}>Success</h1>
          <p className={styles.statusMessage}>{message}</p>
        </div>
      </div>
    )
  }

  if (scanState === 'error') {
    return (
      <div className={styles.fullscreen} style={{ background: '#ef4444' }}>
        <div className={styles.statusContent}>
          <div className={styles.xmark}>✕</div>
          <h1 className={styles.statusTitle}>Failed</h1>
          <p className={styles.statusMessage}>{message}</p>
        </div>
      </div>
    )
  }

  if (scanState === 'processing') {
    return (
      <div className={styles.fullscreen} style={{ background: '#f3f4f6' }}>
        <div className={styles.statusContent}>
          <div className={styles.spinner}></div>
          <p className={styles.processingText}>{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Vendor Scanner</h1>
        <p className={styles.headerSubtitle}>{businessName}</p>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </header>

      <div className={styles.scannerContainer}>
        <div id="qr-reader" className={styles.qrReader}></div>
        
        <div className={styles.instructions}>
          <p>Position QR code within the frame</p>
          <p className={styles.instructionsSmall}>Scanning will start automatically</p>
        </div>

        <button
          onClick={startScanning}
          className={styles.scanButton}
        >
          Start Scanning
        </button>
      </div>
    </div>
  )
}
