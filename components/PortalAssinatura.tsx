import React from "react";

export default function PortalAssinatura() {
  const planos = [
    {
      id: "mensal",
      nome: "Plano Pediatra Pro",
      preco: "R$ 59,90",
      periodo: "/mês",
      link: "https://buy.stripe.com/test_seu_link_aqui",
      caracteristicas: ["PDFs Personalizados", "Gráficos OMS", "Registro de PC"],
    },
    {
      id: "anual",
      nome: "Plano Pediatra Anual",
      preco: "R$ 599,00",
      periodo: "/ano",
      link: "https://buy.stripe.com/test_seu_link_anual",
      destaque: true,
      caracteristicas: ["Tudo do mensal", "2 meses de desconto", "Suporte Prioritário"],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900">Assine para Continuar</h1>
        <p className="text-slate-500 mt-2">Escolha o plano ideal para gerenciar seus pacientes.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {planos.map((plano) => (
          <div
            key={plano.id}
            className={`bg-white rounded-3xl p-8 border-2 transition-all ${
              plano.destaque ? "border-blue-500 shadow-xl scale-105" : "border-slate-200"
            }`}
          >
            {plano.destaque && (
              <span className="bg-blue-500 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase">
                Melhor Valor
              </span>
            )}
            <h3 className="text-xl font-bold mt-4">{plano.nome}</h3>
            <div className="my-6">
              <span className="text-4xl font-black">{plano.preco}</span>
              <span className="text-slate-400">{plano.periodo}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {plano.caracteristicas.map((f) => (
                <li key={f} className="text-sm text-slate-600 flex items-center gap-2">
                  <span className="text-green-500 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            <a
              href={plano.link}
              className={`block text-center py-4 rounded-2xl font-bold transition-all ${
                plano.destaque ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              }`}
            >
              Assinar Agora
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
