export default function LoadingIcon() {
  return (
    <>
      <div className="d-flex justify-content-center">
        <div className="spinner-grow text-warning text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    </>
  );
}
