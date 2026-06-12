// CSS imports
import "bootstrap/dist/css/bootstrap.min.css";

export default function HTTP404() {
  return (
    <>
      <div className="container">
        <h1 className="text-center">
          <i className="bi bi-question-lg text-warning" style={{ display: "block", fontSize: "5rem" }}></i>
          Page Not Found 404
        </h1>
      </div>
    </>
  );
}
