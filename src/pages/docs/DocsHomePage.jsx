import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { getDocApps } from "../../content/documentation";
import { APP_USER_ROLES } from "../../utils/roles";

function DocsHomePage() {
  const { canAccessApp } = useAuth();
  const apps = getDocApps().filter((app) => !APP_USER_ROLES[app.id] || canAccessApp(app.id));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Documentation" }]}
        title="Documentation"
        subtitle="Pages, forms, fields, and step-by-step processes for every application."
        help={false}
      />

      <section className="panel">
        <div className="docs-app-grid">
          {apps.map((app) => (
            <Link key={app.id} to={`/docs/${app.id}`} className="card docs-app-card">
              <h2>{app.label}</h2>
              <p className="subtext">{app.description}</p>
              <span className="docs-topic-count">{app.topicCount} topics</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default DocsHomePage;
