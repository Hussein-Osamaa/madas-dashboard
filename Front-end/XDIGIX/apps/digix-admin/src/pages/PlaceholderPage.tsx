type Props = { title: string };

export default function PlaceholderPage({ title }: Props) {
  return (
    <>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-400">Content for this section is coming soon.</p>
    </>
  );
}
