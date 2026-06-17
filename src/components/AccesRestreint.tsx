interface AccesRestreintProps {
  titre?: string
  message: string
}

export default function AccesRestreint({ titre = 'Accès restreint', message }: AccesRestreintProps) {
  return (
    <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-[#E7F2DE]">
        <div className="w-14 h-14 rounded-full bg-[#B3492F]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#B3492F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-12V7a4 4 0 10-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[#1B3B1A] mb-2">{titre}</h2>
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  )
}
