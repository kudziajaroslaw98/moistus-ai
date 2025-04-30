import { ModalProps } from "@/types/modal-props";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose} // Close when clicking overlay
    >
      {/* Modal Content */}
      <div
        className="w-full max-w-lg rounded-sm bg-zinc-800 shadow-lg"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 p-4">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />{" "}
            </svg>
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
