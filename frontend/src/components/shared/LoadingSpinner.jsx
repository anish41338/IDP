export default function LoadingSpinner({ size = 'md', label }) {
  const dims = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div
        className={`${dims[size]} border-[3px] border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin`}
      />
      {label && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      )}
    </div>
  )
}
