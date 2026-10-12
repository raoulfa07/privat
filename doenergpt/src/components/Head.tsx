type Props = { sub: string };

export default function Head({ sub }: Props) {
  return (
    <div className="head">
      <h2>DÖNER GPT</h2>
      <p>{sub}</p>
    </div>
  );
}
