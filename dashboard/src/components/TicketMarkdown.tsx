import Markdown from "react-markdown";

type Props = {
  source: string;
};

export default function TicketMarkdown({ source }: Props) {
  return (
    <div className="jira-markdown">
      <Markdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}
