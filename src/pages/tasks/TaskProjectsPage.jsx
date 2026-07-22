import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createTaskProject, createTaskTag, getTaskProjects, getTaskTags, updateTaskProject } from "../../api/tasksApi";
import PageHeader from "../../components/PageHeader";

function TaskProjectsPage() {
  const { appName = "tasks" } = useParams();
  const [projects, setProjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#64748b");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      const [projectResult, tagResult] = await Promise.all([getTaskProjects(), getTaskTags()]);
      setProjects(projectResult.projects ?? []);
      setTags(tagResult.tags ?? []);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateProject = async (event) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) return;

    try {
      await createTaskProject({ name, color: projectColor });
      setProjectName("");
      setStatus("Project created.");
      await load();
    } catch (createError) {
      setError(createError.message);
    }
  };

  const handleCreateTag = async (event) => {
    event.preventDefault();
    const name = tagName.trim();
    if (!name) return;

    try {
      await createTaskTag({ name, color: tagColor });
      setTagName("");
      setStatus("Tag created.");
      await load();
    } catch (createError) {
      setError(createError.message);
    }
  };

  const toggleArchive = async (project) => {
    try {
      await updateTaskProject(project.id, { is_archived: !project.is_archived });
      await load();
    } catch (archiveError) {
      setError(archiveError.message);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Tasks", to: `/app/${appName}` },
          { label: "Projects" },
        ]}
        title="Projects & Tags"
        subtitle="Organize work into projects and label tasks with tags."
      />

      {error && <p className="error">{error}</p>}
      {status && <p className="status-text">{status}</p>}

      <div className="tasks-projects-layout">
        <section className="panel">
          <h2>Projects</h2>
          <form className="tasks-inline-form" onSubmit={handleCreateProject}>
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="New project name"
            />
            <input
              type="color"
              value={projectColor}
              onChange={(event) => setProjectColor(event.target.value)}
              aria-label="Project color"
            />
            <button type="submit">Add Project</button>
          </form>

          <ul className="tasks-project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <div>
                  <span className="tasks-project-dot" style={{ backgroundColor: project.color }} />
                  <strong>{project.name}</strong>
                  <span className="subtext">{project.open_task_count} open tasks</span>
                </div>
                <div className="tasks-project-actions">
                  <Link to={`/app/${appName}/list/all?project=${project.id}`}>View tasks</Link>
                  <button type="button" className="linkish-button" onClick={() => toggleArchive(project)}>
                    {project.is_archived ? "Restore" : "Archive"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Tags</h2>
          <form className="tasks-inline-form" onSubmit={handleCreateTag}>
            <input
              type="text"
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              placeholder="New tag name"
            />
            <input
              type="color"
              value={tagColor}
              onChange={(event) => setTagColor(event.target.value)}
              aria-label="Tag color"
            />
            <button type="submit">Add Tag</button>
          </form>

          <ul className="tasks-tag-list">
            {tags.map((tag) => (
              <li key={tag.id}>
                <span className="task-tag" style={{ backgroundColor: `${tag.color}22`, color: tag.color }}>
                  {tag.name}
                </span>
                <span className="subtext">{tag.task_count} tasks</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

export default TaskProjectsPage;
