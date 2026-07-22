import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { getDocApps } from "../../content/documentation";

function DocsHomePage() {
  const apps = getDocApps();

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
