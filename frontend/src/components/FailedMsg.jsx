export default function FailedMsg({ message }) {
  return (
    <>
      <div className="component text-danger d-flex flex-column align-items-center" style={{ padding: "32px" }}>
        <h1>
          <i className="bi bi-exclamation-square"></i>
        </h1>
        <h5>Oops. Something went wrong</h5>
        <p className="text-gray">{message}</p>
      </div>
    </>
  );
}
