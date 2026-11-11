import { useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { QRCodeSVG } from 'qrcode.react'

// エフェクトの型定義
type Effect = {
  id: number
  peerId: string
  text: string
  color: string
  size: string
  x: number
  y: number
}

// 映像パネルコンポーネント（PC側）
function VideoPanel({
  stream,
  effects,
}: {
  stream: MediaStream
  effects: Effect[]
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl bg-black shadow-lg [container-type:inline-size]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />
      {effects.map((effect) => (
        <span
          key={effect.id}
          className={`pointer-events-none absolute animate-[floatUp_1s_ease-out_forwards] font-black ${effect.size}`}
          style={{
            left: `${effect.x}%`,
            bottom: `${effect.y}%`,
            color: effect.color,
          }}
        >
          {effect.text}
        </span>
      ))}
    </div>
  )
}

// スマホ操作画面コンポーネント
function Smartphone({ peerId }: { peerId: string }) {
  const [text, setText] = useState('ドン！')
  const [color, setColor] = useState('#ffea00') // 初期色: 黄色
  const [size, setSize] = useState('text-xl') // 初期サイズ: 中
  const connRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const peer = new Peer()

    peer.on('open', () => {
      // 外カメラ（environment）を優先して取得
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
          peer.call(peerId, stream)
        })
        .catch(() => {
          // 万が一外カメラでエラーが出た場合は標準のカメラを読み込む
          navigator.mediaDevices
            .getUserMedia({ video: true, audio: false })
            .then((stream) => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream
              }
              peer.call(peerId, stream)
            })
        })

      // データ通信の接続
      const conn = peer.connect(peerId)
      connRef.current = conn
    })

    return () => {
      peer.destroy()
    }
  }, [peerId])

  const sendData = () => {
    if (connRef.current) {
      // テキスト・色・サイズをまとめてオブジェクトで送信
      connRef.current.send({ text, color, size })
    }
  }

  return (
    <div
      onClick={sendData}
      className="flex min-h-screen flex-col items-center justify-between bg-slate-900 p-4 text-white select-none cursor-pointer"
    >
      <div className="w-full text-center">
        <h1 className="text-lg font-bold">カメラ送信中</h1>
        <p className="text-xs text-slate-400">タップして画面に文字を飛ばす</p>
      </div>

      {/* 自分のカメラプレビュー */}
      <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
      </div>

      {/* 文字カスタマイズ設定エリア */}
      <div className="w-full max-w-xs space-y-3 rounded-xl bg-slate-800 p-4 shadow-md">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            送信する文字
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded bg-slate-700 px-3 py-2 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 色選択パレット */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            文字の色
          </label>
          <div className="flex justify-between gap-1">
            {['#ffffff', '#ff4d4d', '#ffea00', '#4dff88', '#00e5ff', '#ff66cc'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setColor(c)
                }}
                className={`h-7 w-7 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-white ring-2 ring-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* サイズ選択ボタン */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            文字の大きさ
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: '小', val: 'text-sm' },
              { label: '中', val: 'text-xl' },
              { label: '大', val: 'text-3xl' },
            ].map((s) => (
              <button
                key={s.val}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSize(s.val)
                }}
                className={`rounded py-1.5 font-bold transition-colors ${
                  size === s.val
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// メインのAppコンポーネント（PCモニター画面）
export default function App() {
  const [peerId, setPeerId] = useState<string>('')
  const [videos, setVideos] = useState<{ peerId: string; stream: MediaStream }[]>([])
  const [effects, setEffects] = useState<Effect[]>([])

  const urlParams = new URLSearchParams(window.location.search)
  const targetPeerId = urlParams.get('peer')

  useEffect(() => {
    if (targetPeerId) return

    const peer = new Peer()

    peer.on('open', (id) => {
      setPeerId(id)
    })

    // 映像ストリームを受信
    peer.on('call', (call) => {
      call.answer()
      call.on('stream', (remoteStream) => {
        setVideos((prev) => {
          if (prev.some((v) => v.peerId === call.peer)) return prev
          return [...prev, { peerId: call.peer, stream: remoteStream }]
        })
      })
    })

    // データ（文字・色・サイズ）を受信
    peer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        const payload =
          typeof data === 'object' && data !== null
            ? data
            : { text: String(data), color: '#ffffff', size: 'text-xl' }

        setEffects((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            peerId: conn.peer,
            text: payload.text || 'ドン！',
            color: payload.color || '#ffffff',
            size: payload.size || 'text-xl',
            x: 30 + Math.random() * 40,
            y: 10 + Math.random() * 20,
          },
        ])
      })
    })

    return () => {
      peer.destroy()
    }
  }, [targetPeerId])

  if (targetPeerId) {
    return <Smartphone peerId={targetPeerId} />
  }

  const joinUrl = `${window.location.origin}${window.location.pathname}?peer=${peerId}`

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-900 p-6 text-white">
      <h1 className="mb-4 text-2xl font-bold">映像モニター</h1>

      {peerId ? (
        <div className="mb-8 flex flex-col items-center rounded-xl bg-slate-800 p-4 shadow-lg">
          <p className="mb-2 text-sm text-slate-300">スマホでQRコードを読み取ってください</p>
          <div className="rounded-lg bg-white p-2">
            <QRCodeSVG value={joinUrl} size={160} />
          </div>
          <p className="mt-2 text-xs text-slate-400">接続数: {videos.length} 台</p>
        </div>
      ) : (
        <p className="mb-8 text-slate-400">Peer ID を取得中...</p>
      )}

      {/* 映像一覧 */}
      <div className="flex flex-wrap justify-center gap-4 w-full max-w-5xl">
        {videos.map((video) => (
          <VideoPanel
            key={video.peerId}
            stream={video.stream}
            effects={effects.filter((effect) => effect.peerId === video.peerId)}
          />
        ))}
      </div>
    </div>
  )
}