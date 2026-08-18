import { Link, Navigate, useParams } from "react-router-dom";
import DocContent from "../../components/docs/DocContent";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { getDocApp, getDocTopic, getDocTopics } from "../../content/documentation";
import { APP_USER_ROLES } from "../../utils/roles";

function DocsAppPage() {
  const { appName } = useParams();
  const { canAccessApp } = useAuth();
  const app = getDocApp(appName);
  const topics = getDocTopics(appName);
  const overview = getDocTopic(appName, "overview");

  if (APP_USER_ROLES[appName] && !canAccessApp(appName)) {
    return <Navigate to="/access-denied" replace />;
  }

  if (!app) {
    return (
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Documentation", to: "/docs" }, { label: "Not found" }]}
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
          { label: app.label },
        ]}
        title={`${app.label} documentation`}
        subtitle={app.description}
        help={false}
      />

      <section className="panel docs-page-layout">
        <aside className="docs-topic-nav inset-panel">
          <h2>Topics</h2>
          <ul className="docs-topic-list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link to={`/docs/${appName}/${topic.id}`}>{topic.title}</Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="docs-topic-body">
          {overview && <DocContent doc={{ ...overview, appId: appName, topicId: "overview" }} />}
        </div>
      </section>
    </>
  );
}

export default DocsAppPage;
