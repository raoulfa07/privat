import { LAUNCHED } from "./config";
import Teaser from "./components/Teaser";
import Flow from "./components/Flow";

export default function App() {
  return LAUNCHED ? <Flow /> : <Teaser />;
}
