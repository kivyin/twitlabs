import { Link } from "react-router-dom";
import { buildDocsPath } from "../../utils/docHelp";

function DocContent({ doc, showFullLink = false }) {
  if (!doc) {
    return <p className="subtext">No documentation is available for this page yet.</p>;
  }

  return (
    <div className="doc-content">
      {doc.summary && <p className="doc-summary">{doc.summary}</p>}

      {(doc.sections ?? []).map((section) => (
        <section key={section.heading} className="doc-section">
          <h3>{section.heading}</h3>
          {section.body && <p>{section.body}</p>}
          {section.bullets && (
            <ul className="doc-bullets">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {doc.fields?.length > 0 && (
        <section className="doc-section">
          <h3>Field reference</h3>
          <div className="doc-field-table-wrap">
            <table className="doc-field-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>What it does</th>
                </tr>
              </thead>
              <tbody>
                {doc.fields.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <strong>{item.label}</strong>
                      <span className="doc-field-name">{item.name}</span>
                    </td>
                    <td>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showFullLink && (
        <p className="doc-full-link">
          <Link to={buildDocsPath(doc.appId, doc.topicId)}>Open full documentation page</Link>
        </p>
      )}
    </div>
  );
}

export default DocContent;
