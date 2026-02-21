type Props = {
  message?: string;
};

const FullScreenLoader = ({ message = 'Loading dashboard...' }: Props) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-base text-primary gap-4">
    <span className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    <p className="text-sm text-primary/80">{message}</p>
  </div>
);

export default FullScreenLoader;

