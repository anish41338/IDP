export default function VideoFeed({ frameDataUrl, connected, error, videoRef, canvasRef }) {
  return (
    <div className="relative bg-slate-950 rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
      {/* Hidden capture elements */}
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* Annotated frame */}
      {frameDataUrl ? (
        <img
          src={frameDataUrl}
          alt="Pose detection feed"
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {error ? (
            <div className="text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-slate-600 text-xs mt-1">Check camera permissions</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-slate-600 text-xs">Connecting camera...</p>
            </div>
          )}
        </div>
      )}

      {/* Connection badge */}
      <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
        connected
          ? 'bg-emerald-600/90 text-white'
          : 'bg-slate-700/90 text-slate-400'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
        {connected ? 'Live' : 'Disconnected'}
      </div>
    </div>
  )
}
