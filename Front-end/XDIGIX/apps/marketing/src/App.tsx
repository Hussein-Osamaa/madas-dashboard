import { LayoutDashboard, DollarSign, Package, ShoppingCart } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-navy-900 text-white">
      {/* Nav */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
            XDIGIX
          </span>
          <nav className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="/dashboard" className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-medium">
              Log in
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Run your entire business{' '}
            <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
              from one platform
            </span>
          </h1>
          <p className="text-lg text-gray-400 mb-10">
            POS, Inventory, Finance, E-commerce — everything you need, integrated and ready to grow.
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-navy-900 font-semibold hover:from-amber-300 hover:to-amber-400 transition-all"
          >
            Start free trial
          </a>
        </div>

        {/* Features */}
        <section id="features" className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: LayoutDashboard, title: 'Dashboard', desc: 'Overview, analytics, and tasks in one place' },
            { icon: DollarSign, title: 'Finance', desc: 'Revenue, expenses, and reports' },
            { icon: Package, title: 'Fulfillment', desc: 'Orders, shipping, and scan logs' },
            { icon: ShoppingCart, title: 'E-commerce', desc: 'Store, products, and checkout' },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-colors"
            >
              <Icon className="w-10 h-10 text-amber-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-gray-400 text-sm">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} XDIGIX. All-in-One Business Platform.
        </div>
      </footer>
    </div>
  );
}

export default App;
