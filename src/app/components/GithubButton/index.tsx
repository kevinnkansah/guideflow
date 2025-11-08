import { Button } from "@crayonai/react-ui";
import { Github, StarIcon } from "lucide-react";

export const GithubButton = () => {
  const handleClick = () => {
    window.open("https://github.com/thesysdev/canvas-with-c1", "_blank");
  };

  return (
    <Button
      className="fixed right-2 bottom-12"
      iconLeft={<Github />}
      iconRight={<StarIcon color="#eac54f" fill="#eac54f" />}
      onClick={handleClick}
      variant="primary"
    >
      Github
    </Button>
  );
};
