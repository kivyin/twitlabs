import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollectionDefinitions } from "../api/dictionaryApi";

function BudgetHomePage() {
  const { appName = "budget" } = useParams();
  const [tables, setTables] = useState([]);
  const [appTitle, setAppTitle] = useState("Application");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTables() {
      try {
        const list = await getCollectionDefinitions(appName);
        setTables(list);
        setAppTitle(list[0]?.application_title || appName);
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadTables();
  }, [appName]);

  return (
    <section className="panel">
      <h1>{appTitle} Home</h1>
      <p className="subtext">Select a table to open records.</p>
      {error && <p className="error">{error}</p>}
      <div className="table-links">
        {tables
          .filter((table) => !["system_dictionary", "applications", "users"].includes(table.name))
          .map((table) => (
            <Link
              key={table.name}
              className="link-button"
              to={`/app/${appName}/${table.name}`}
              title={table.name}
            >
              {table.label}
            </Link>
          ))}
      </div>
    </section>
  );
}

export default BudgetHomePage;
