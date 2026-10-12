type Props = { tagline: string };

export default function Sign({ tagline }: Props) {
  return (
    <h1 className="sign">
      DönerGPT<small>{tagline}</small>
    </h1>
  );
}
