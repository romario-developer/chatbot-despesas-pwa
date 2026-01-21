import CreditCardsSection from "../components/dashboard/CreditCardsSection";

const CardsPage = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Cartões</h1>
        <p className="text-sm text-slate-500">
          Cadastre e mantenha seus cartões sob controle.
        </p>
      </div>
    </div>
    <CreditCardsSection />
  </div>
);

export default CardsPage;
