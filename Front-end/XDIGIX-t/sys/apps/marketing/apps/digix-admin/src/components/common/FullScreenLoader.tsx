type Props = {
  message?: string;
};

const FullScreenLoader = ({ message = 'Loading...' }: Props) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0b1a] relative">
    {/* Background effects */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>

    <div className="relative z-10 flex flex-col items-center gap-6">
      {/* Logo */}
      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
        <span className="text-[#0a0b1a] text-2xl font-black">X</span>
      </div>

      {/* Spinner */}
      <div className="relative">
        <div className="w-12 h-12 border-3 border-white/10 border-t-amber-400 rounded-full animate-spin" />
      </div>

      {/* Message */}
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  </div>
);

export default FullScreenLoader;
