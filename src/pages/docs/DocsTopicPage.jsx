import { Link, useParams } from "react-router-dom";
import DocContent from "../../components/docs/DocContent";
import PageHeader from "../../components/PageHeader";
import { getDocApp, getDocTopicOrReport, getDocTopics } from "../../content/documentation";

function DocsTopicPage() {
  const { appName, topic } = useParams();
  const app = getDocApp(appName);
  const doc = getDocTopicOrReport(appName, topic);
  const topics = getDocTopics(appName);

  if (!app || !doc) {
    return (
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Documentation", to: "/docs" },
          { label: "Not found" },
        ]}
        title="Documentation not found"
        help={false}
      />
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Documentation", to: "/docs" },
          { label: app.label, to: `/docs/${appName}` },
          { label: doc.title },
        ]}
        title={doc.title}
        subtitle={doc.summary}
        help={false}
      />

      <section className="panel docs-page-layout">
        <aside className="docs-topic-nav inset-panel">
          <h2>Topics</h2>
          <ul className="docs-topic-list">
            {topics.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/docs/${appName}/${item.id}`}
                  className={item.id === topic ? "active" : undefined}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="docs-topic-body">
          <DocContent doc={{ ...doc, appId: appName, topicId: topic }} />
        </div>
      </section>
    </>
  );
}

export default DocsTopicPage;
