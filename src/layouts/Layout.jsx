import Header from "../components/Header";
import Footer from "../components/Footer";
import ThemeToggle from "../components/ThemeToggle";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-base text-text dark:bg-darkBase dark:text-darkText font-sans transition-colors duration-500">
      <Header />
      <main className="flex-grow p-4">{children}</main>
      <Footer />
      <ThemeToggle />
    </div>
  );
}
