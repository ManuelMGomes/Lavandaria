import React from 'react';
import { ArrowLeft, Users, Target, Eye } from 'lucide-react';
import { LaundrySettings } from '../types';

interface AboutPageProps {
  settings: LaundrySettings;
  onBack: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ settings, onBack }) => {
  const story = settings.aboutStory?.trim() ?? '';
  const mission = settings.aboutMission?.trim() ?? '';
  const vision = settings.aboutVision?.trim() ?? '';
  const team = (settings.aboutTeam ?? []).filter((member) => member.name.trim() || member.role.trim());

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#ffffff_35%,#edf6ff_100%)] px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#0e2a47] hover:text-[#12345a] font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="card-modern p-8 md:p-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0e2a47] mb-3">Sobre a GenOmni</h1>
          <p className="text-slate-600 text-lg max-w-4xl">
            {story || 'Conteúdo institucional ainda não foi definido.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-modern p-7">
            <div className="w-12 h-12 rounded-xl bg-[#dff2ff] text-[#0e2a47] flex items-center justify-center mb-4">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#0e2a47] mb-2">Missão</h2>
            <p className="text-slate-600">{mission || 'Sem missão definida.'}</p>
          </div>

          <div className="card-modern p-7">
            <div className="w-12 h-12 rounded-xl bg-[#dff2ff] text-[#0e2a47] flex items-center justify-center mb-4">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#0e2a47] mb-2">Visão</h2>
            <p className="text-slate-600">{vision || 'Sem visão definida.'}</p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[#0e2a47]">
            <Users className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Equipa Técnica</h2>
          </div>
          {team.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {team.map((member, idx) => (
                <article key={`${member.name}-${idx}`} className="card-modern p-5">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#dff2ff] mb-4">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#0e2a47] font-bold text-xl">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{member.name}</h3>
                  <p className="text-slate-500">{member.role}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="card-modern p-5 text-slate-500">Nenhum técnico institucional cadastrado.</div>
          )}
        </section>
      </div>
    </div>
  );
};
