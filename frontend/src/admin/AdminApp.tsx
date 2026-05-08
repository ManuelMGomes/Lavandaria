import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import {
  LayoutDashboard,
  Ticket,
  Building2,
  ShieldCheck,
  Users,
  FileText,
  Image,
  LogOut,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import {
  adminBlockUser,
  adminImpersonate,
  adminListAuditLogs,
  adminListCompanies,
  adminListUsers,
  adminLogin,
  adminResetPassword,
  adminSuspendCompany,
  AdminCompany,
  AdminUser,
  AuditLogDto,
  getSupportTicket,
  listSupportTickets,
  sendSupportMessage,
  SupportTicketDto,
} from '../lib/supportGenomnApi';
import { getBootstrap, updateInstitutionalSettings } from '../lib/api';
import { fileToOptimizedDataUrl } from '../lib/imageUpload';
import { toUserErrorMessage } from '../lib/userErrors';
import { LaundrySettings } from '../types';

type Tab = 'dashboard' | 'tickets' | 'companies' | 'licenses' | 'institutional' | 'users' | 'logs';

const tabMeta: Array<{ id: Tab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'companies', label: 'Empresas', icon: Building2 },
  { id: 'licenses', label: 'Licenças', icon: ShieldCheck },
  { id: 'institutional', label: 'Site Institucional', icon: Image },
  { id: 'users', label: 'Utilizadores', icon: Users },
  { id: 'logs', label: 'Auditoria', icon: FileText },
];

export function AdminApp() {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('support_genomn_admin_token'));
  const [actorId, setActorId] = useState<string | null>(sessionStorage.getItem('support_genomn_admin_actor_id'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [savingCompanyId, setSavingCompanyId] = useState<number | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [institutionalSaving, setInstitutionalSaving] = useState(false);
  const [institutionalData, setInstitutionalData] = useState<LaundrySettings | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'blocked' | 'unblocked'>('all');
  const [licenseDrafts, setLicenseDrafts] = useState<
    Record<number, { status: 'active' | 'suspended'; licenseType: 'annual' | 'semiannual'; licenseExpiryDate: string }>
  >({});
  const [panelError, setPanelError] = useState('');
  const [panelNotice, setPanelNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  const showPanelNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setPanelNotice({ type, message });
  };

  const clearAdminSession = () => {
    sessionStorage.removeItem('support_genomn_admin_token');
    sessionStorage.removeItem('support_genomn_admin_actor_id');
    setToken(null);
    setActorId(null);
  };

  const sanitizeAboutTeam = (team?: LaundrySettings['aboutTeam']) =>
    (team ?? [])
      .map((member) => ({
        name: member.name.trim(),
        role: member.role.trim(),
        photo: member.photo?.trim() || '',
      }))
      .filter((member) => member.name || member.role || member.photo);

  const createFallbackSettings = (): LaundrySettings => ({
    companyName: 'GenOmni',
    tradeName: 'GenOmni',
    nif: '000000000',
    companyType: 'Lda',
    country: 'Angola',
    province: '',
    municipality: '',
    fullAddress: '',
    postalCode: '',
    phone: '',
    email: 'contato@genomni.com',
    website: '',
    ivaRegime: 'geral',
    defaultIvaRate: 14,
    currency: 'Kz',
    invoiceSeries: new Date().getFullYear().toString(),
    startInvoiceNumber: 1,
    withholdingTaxPercentage: 0,
    bankName: '',
    accountNumber: '',
    iban: '',
    invoiceModel: 'A4',
    invoiceNumberFormat: 'SERIE/NUMERO',
    allowCreditSales: false,
    defaultDueDays: 30,
    allowGlobalDiscount: true,
    printerName: '',
    printerConnectionType: 'usb',
    printerIpAddress: '',
    autoPrintReceipt: false,
    autoDownloadPDF: false,
    landingBannerImage: '',
    aboutStory: '',
    aboutMission: '',
    aboutVision: '',
    aboutTeam: [],
  });

  const loadAll = async (adminToken: string) => {
    const [c, u, l] = await Promise.all([
      adminListCompanies(adminToken),
      adminListUsers(adminToken),
      adminListAuditLogs(adminToken),
    ]);
    setCompanies(c);
    setUsers(u);
    setLogs(l);
    setLicenseDrafts((prev) => {
      const next = { ...prev };
      c.forEach((company) => {
        if (!next[company.id]) {
          next[company.id] = {
            status: company.status,
            licenseType: company.licenseType,
            licenseExpiryDate: company.licenseExpiryDate ?? '',
          };
        }
      });
      return next;
    });
  };

  const loadInstitutionalData = async () => {
    const payload = await getBootstrap();
    const settings = payload.settings ?? createFallbackSettings();
    setInstitutionalData({
      ...settings,
      aboutStory: settings.aboutStory ?? '',
      aboutMission: settings.aboutMission ?? '',
      aboutVision: settings.aboutVision ?? '',
      aboutTeam: sanitizeAboutTeam(settings.aboutTeam),
    });
    setSettingsLoaded(true);
  };

  const refreshTickets = async () => {
    if (!actorId) return;
    const items = await listSupportTickets(actorId);
    setTickets(items);
    if (selectedTicketId) {
      const exists = items.some((t) => t.id === selectedTicketId);
      if (!exists) setSelectedTicketId(items[0]?.id ?? null);
    } else if (items.length > 0) {
      setSelectedTicketId(items[0].id);
    }
  };

  useEffect(() => {
    if (!token || !actorId) return;
    setPanelError('');
    loadAll(token).catch((error) => {
      const message = toUserErrorMessage(error, 'Não foi possível carregar o painel técnico.');
      if (message === 'Sessão administrativa inválida.') {
        clearAdminSession();
        showPanelNotice('error', 'A sessão técnica expirou ou ficou inválida. Entre novamente.');
        return;
      }

      setPanelError(message);
    });
    loadInstitutionalData().catch((error) => {
      setPanelError(toUserErrorMessage(error, 'Não foi possível carregar os dados institucionais.'));
    });
  }, [token, actorId]);

  useEffect(() => {
    if (!actorId) return;
    refreshTickets().catch(() => undefined);
  }, [actorId]);

  const totals = useMemo(() => {
    const activeCompanies = companies.filter((c) => c.status === 'active').length;
    const blockedUsers = users.filter((u) => u.isBlocked).length;
    return { activeCompanies, blockedUsers };
  }, [companies, users]);

  const sidebarCounts = useMemo(
    () => ({
      tickets: tickets.filter((t) => t.status !== 'closed').length,
      companies: companies.filter((c) => c.status === 'suspended').length,
      users: users.filter((u) => u.isBlocked).length,
    }),
    [tickets, companies, users],
  );

  const getTabBadge = (id: Tab) => {
    if (id === 'tickets') return sidebarCounts.tickets;
    if (id === 'companies') return sidebarCounts.companies;
    if (id === 'users') return sidebarCounts.users;
    return 0;
  };

  const getBadgeClass = (id: Tab) => {
    if (id === 'tickets') return 'bg-amber-400 text-amber-950';
    if (id === 'companies' || id === 'users') return 'bg-red-400 text-red-950';
    return 'bg-[#4ea9d9] text-[#0e2a47]';
  };

  const filteredTickets = useMemo(
    () => tickets.filter((ticket) => (ticketStatusFilter === 'all' ? true : ticket.status === ticketStatusFilter)),
    [tickets, ticketStatusFilter],
  );

  const filteredCompanies = useMemo(
    () => companies.filter((company) => (companyStatusFilter === 'all' ? true : company.status === companyStatusFilter)),
    [companies, companyStatusFilter],
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (userStatusFilter === 'all') return true;
        if (userStatusFilter === 'blocked') return user.isBlocked;
        return !user.isBlocked;
      }),
    [users, userStatusFilter],
  );

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setPanelNotice(null);
    try {
      const res = await adminLogin({ email, password });
      setToken(res.token);
      setActorId(res.user.id);
      sessionStorage.setItem('support_genomn_admin_token', res.token);
      sessionStorage.setItem('support_genomn_admin_actor_id', res.user.id);
    } catch (error) {
      showPanelNotice('error', toUserErrorMessage(error, 'Não foi possível iniciar sessão técnica.'));
    }
  };

  const handleLogout = () => {
    clearAdminSession();
  };

  const handleOpenTicket = async (ticketId: number) => {
    if (!actorId) return;
    const full = await getSupportTicket(actorId, ticketId);
    setTickets((prev) => prev.map((t) => (t.id === full.id ? full : t)));
    setSelectedTicketId(ticketId);
  };

  const handleReplyTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!actorId || !selectedTicket || !replyMessage.trim()) return;
    await sendSupportMessage(actorId, { ticket_id: selectedTicket.id, message: replyMessage.trim() });
    const refreshed = await getSupportTicket(actorId, selectedTicket.id);
    setTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)));
    setReplyMessage('');
  };

  const saveLicenseDraft = async (companyId: number) => {
    if (!token) return;
    const draft = licenseDrafts[companyId];
    if (!draft) return;
    try {
      setSavingCompanyId(companyId);
      await adminSuspendCompany(token, companyId, {
        status: draft.status,
        licenseType: draft.licenseType,
        licenseExpiryDate: draft.licenseExpiryDate || undefined,
      });
      await loadAll(token);
    } catch (error) {
      showPanelNotice('error', toUserErrorMessage(error, 'Não foi possível salvar a licença.'));
    } finally {
      setSavingCompanyId(null);
    }
  };

  const handleInstitutionalSave = async () => {
    if (!institutionalData) return;
    try {
      setInstitutionalSaving(true);
      const aboutTeam = sanitizeAboutTeam(institutionalData.aboutTeam);
      const saved = await updateInstitutionalSettings({
        landingBannerImage: institutionalData.landingBannerImage,
        aboutStory: institutionalData.aboutStory,
        aboutMission: institutionalData.aboutMission,
        aboutVision: institutionalData.aboutVision,
        aboutTeam,
      });
      setInstitutionalData((prev) =>
        prev
          ? { ...prev, ...saved, aboutTeam: sanitizeAboutTeam(saved.aboutTeam) }
          : { ...saved, aboutTeam: sanitizeAboutTeam(saved.aboutTeam) }
      );
      showPanelNotice('success', 'Conteúdo institucional atualizado com sucesso.');
    } catch (error) {
      showPanelNotice('error', toUserErrorMessage(error, 'Não foi possível guardar o conteúdo institucional.'));
    } finally {
      setInstitutionalSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#f5fbff_0%,#ffffff_100%)] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 w-full max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-[#0e2a47]">GenOmni Admin Oculto</h1>
          <p className="text-sm text-slate-500">Acesso exclusivo para equipa técnica.</p>
          {panelNotice && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                panelNotice.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : panelNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {panelNotice.message}
            </div>
          )}
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (panelNotice?.type === 'error') setPanelNotice(null);
            }}
            className="w-full px-3 py-2 border rounded-lg"
            type="email"
            placeholder="email técnico"
            required
          />
          <input
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (panelNotice?.type === 'error') setPanelNotice(null);
            }}
            className="w-full px-3 py-2 border rounded-lg"
            type="password"
            placeholder="senha técnica"
            required
          />
          <button className="w-full bg-[#0e2a47] hover:bg-[#12345a] text-white py-2 rounded-lg font-semibold" type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-72 bg-[#0e2a47] text-white p-5 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#4ea9d9] text-[#0e2a47] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">Sistema GenOmni</p>
            <p className="text-xs text-blue-100">Painel Técnico</p>
          </div>
        </div>

        <nav className="space-y-2">
          {tabMeta.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                tab === item.id ? 'bg-white text-[#0e2a47] font-semibold' : 'text-blue-100 hover:bg-[#12345a]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {getTabBadge(item.id) > 0 && (
                <span
                  className={`ml-auto min-w-6 h-6 px-2 rounded-full text-xs flex items-center justify-center ${
                    tab === item.id ? 'bg-[#0e2a47] text-white' : `${getBadgeClass(item.id)} font-bold`
                  }`}
                >
                  {getTabBadge(item.id)}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {panelError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3">
            <span>{panelError}</span>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-1 hover:bg-red-100"
              onClick={() => setPanelError('')}
              aria-label="Fechar aviso de erro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {panelNotice && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
              panelNotice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : panelNotice.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            <span>{panelNotice.message}</span>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-1 hover:bg-white/60"
              onClick={() => setPanelNotice(null)}
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {(tab === 'tickets' || tab === 'companies' || tab === 'users') && (
          <div className="mb-5 card-modern p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Filtros rápidos:</span>

            {tab === 'tickets' && (
              <>
                {(['all', 'open', 'in_progress', 'closed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setTicketStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      ticketStatusFilter === status
                        ? 'bg-[#0e2a47] text-white border-[#0e2a47]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </>
            )}

            {tab === 'companies' && (
              <>
                {(['all', 'active', 'suspended'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setCompanyStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      companyStatusFilter === status
                        ? 'bg-[#0e2a47] text-white border-[#0e2a47]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </>
            )}

            {tab === 'users' && (
              <>
                {(['all', 'blocked', 'unblocked'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setUserStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      userStatusFilter === status
                        ? 'bg-[#0e2a47] text-white border-[#0e2a47]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">Painel Administrativo</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-modern p-5"><p className="text-slate-500">Empresas ativas</p><p className="text-3xl font-bold">{totals.activeCompanies}</p></div>
              <div className="card-modern p-5"><p className="text-slate-500">Usuários bloqueados</p><p className="text-3xl font-bold">{totals.blockedUsers}</p></div>
              <div className="card-modern p-5"><p className="text-slate-500">Eventos de auditoria</p><p className="text-3xl font-bold">{logs.length}</p></div>
            </div>
          </div>
        )}

        {tab === 'tickets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Tickets de Suporte</h2>
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#dff2ff] text-[#0e2a47] font-semibold" onClick={() => refreshTickets()}>
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card-modern overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-700">Lista de Tickets</div>
                <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100">
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => handleOpenTicket(ticket.id)}
                      className={`w-full text-left px-4 py-3 ${selectedTicketId === ticket.id ? 'bg-[#dff2ff]' : 'hover:bg-slate-50'}`}
                    >
                      <p className="font-semibold text-slate-800">#{ticket.id} {ticket.subject}</p>
                      <p className="text-xs text-slate-500">{ticket.user.name} - {ticket.user.email}</p>
                      <p className="text-[11px] uppercase text-slate-500">{ticket.status}</p>
                    </button>
                  ))}
                  {filteredTickets.length === 0 && <p className="p-4 text-sm text-slate-400">Sem tickets para este filtro.</p>}
                </div>
              </div>

              <div className="lg:col-span-2 card-modern p-4 min-h-[620px] flex flex-col">
                {selectedTicket ? (
                  <>
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="font-bold text-slate-800">#{selectedTicket.id} - {selectedTicket.subject}</h3>
                      <p className="text-sm text-slate-500">
                        Cliente: {selectedTicket.user.name} ({selectedTicket.user.email})
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto py-4 space-y-3">
                      {selectedTicket.messages.map((m) => (
                        <div key={m.id} className={`max-w-[85%] px-3 py-2 rounded-xl ${m.senderType === 'support' ? 'bg-emerald-50 ml-auto' : 'bg-slate-100'}`}>
                          <p className="text-xs font-semibold text-slate-500 uppercase">{m.senderType === 'support' ? 'Suporte' : 'Cliente'}</p>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.message}</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleReplyTicket} className="pt-3 border-t border-slate-100 flex gap-2">
                      <input
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                        placeholder="Responder cliente..."
                        required
                      />
                      <button className="px-4 py-2 bg-[#0e2a47] hover:bg-[#12345a] text-white rounded-lg font-semibold inline-flex items-center gap-2" type="submit">
                        <Send className="w-4 h-4" />
                        Responder
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400">Selecione um ticket.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'companies' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Gestão de Empresas</h2>
            <div className="card-modern overflow-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b"><th className="p-3">Empresa</th><th className="p-3">Status</th><th className="p-3">Licença</th><th className="p-3">Ações</th></tr></thead>
                <tbody>
                  {filteredCompanies.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3">{c.licenseType} / {c.licenseExpiryDate ?? 'N/A'}</td>
                      <td className="p-3">
                        <button
                          className="px-3 py-1 rounded bg-slate-800 text-white"
                          onClick={async () => {
                            const nextStatus = c.status === 'active' ? 'suspended' : 'active';
                            await adminSuspendCompany(token, c.id, { status: nextStatus });
                            await loadAll(token);
                          }}
                        >
                          {c.status === 'active' ? 'Suspender' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCompanies.length === 0 && <p className="p-4 text-sm text-slate-400">Sem empresas para este filtro.</p>}
            </div>
          </div>
        )}

        {tab === 'licenses' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Gestão de Licenças</h2>
            <div className="card-modern overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Expira em</th>
                    <th className="p-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => {
                    const draft = licenseDrafts[company.id] ?? {
                      status: company.status,
                      licenseType: company.licenseType,
                      licenseExpiryDate: company.licenseExpiryDate ?? '',
                    };

                    return (
                      <tr key={company.id} className="border-b">
                        <td className="p-3">{company.name}</td>
                        <td className="p-3">
                          <select
                            className="px-2 py-1 border rounded"
                            value={draft.status}
                            onChange={(e) =>
                              setLicenseDrafts((prev) => ({
                                ...prev,
                                [company.id]: { ...draft, status: e.target.value as 'active' | 'suspended' },
                              }))
                            }
                          >
                            <option value="active">active</option>
                            <option value="suspended">suspended</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            className="px-2 py-1 border rounded"
                            value={draft.licenseType}
                            onChange={(e) =>
                              setLicenseDrafts((prev) => ({
                                ...prev,
                                [company.id]: { ...draft, licenseType: e.target.value as 'annual' | 'semiannual' },
                              }))
                            }
                          >
                            <option value="annual">annual</option>
                            <option value="semiannual">semiannual</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            className="px-2 py-1 border rounded"
                            value={draft.licenseExpiryDate}
                            onChange={(e) =>
                              setLicenseDrafts((prev) => ({
                                ...prev,
                                [company.id]: { ...draft, licenseExpiryDate: e.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => saveLicenseDraft(company.id)}
                            disabled={savingCompanyId === company.id}
                            className="px-3 py-1 rounded bg-[#0e2a47] text-white disabled:opacity-60"
                          >
                            {savingCompanyId === company.id ? 'Salvando...' : 'Salvar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'institutional' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Site Institucional</h2>
            {!settingsLoaded || !institutionalData ? (
              <div className="card-modern p-6 text-slate-500">Carregando dados institucionais...</div>
            ) : (
              <div className="card-modern p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Página Inicial e Sobre</h3>
                  <p className="text-sm text-slate-500">Gerencie o banner e os campos institucionais visíveis no site público.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Imagem do Banner da Homepage</label>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    {institutionalData.landingBannerImage ? (
                      <img src={institutionalData.landingBannerImage} alt="Banner homepage" className="w-full h-52 object-cover" />
                    ) : (
                      <div className="h-52 flex items-center justify-center text-slate-400">Sem imagem</div>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#dff2ff] text-[#0e2a47] text-sm font-semibold cursor-pointer w-fit">
                    <Upload className="w-4 h-4" />
                    Trocar imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const image = await fileToOptimizedDataUrl(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.8 });
                          setInstitutionalData((prev) => (prev ? { ...prev, landingBannerImage: image } : prev));
                        } catch (error) {
                          showPanelNotice('error', toUserErrorMessage(error, 'Não foi possível processar a imagem.'));
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="grid gap-3">
                  <textarea
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl min-h-24"
                    value={institutionalData.aboutStory || ''}
                    onChange={(e) => setInstitutionalData((prev) => (prev ? { ...prev, aboutStory: e.target.value } : prev))}
                    placeholder="História da empresa"
                  />
                  <textarea
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl min-h-20"
                    value={institutionalData.aboutMission || ''}
                    onChange={(e) => setInstitutionalData((prev) => (prev ? { ...prev, aboutMission: e.target.value } : prev))}
                    placeholder="Missão"
                  />
                  <textarea
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl min-h-20"
                    value={institutionalData.aboutVision || ''}
                    onChange={(e) => setInstitutionalData((prev) => (prev ? { ...prev, aboutVision: e.target.value } : prev))}
                    placeholder="Visão"
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800">Preview em tempo real</h4>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                        Homepage (Hero)
                      </div>
                      <div className="relative h-56">
                        {institutionalData.landingBannerImage ? (
                          <img
                            src={institutionalData.landingBannerImage}
                            alt="Preview homepage"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0e2a47_0%,#4ea9d9_100%)]" />
                        )}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,42,71,0.35),rgba(14,42,71,0.75))]" />
                        <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
                          <p className="text-[11px] uppercase tracking-wide text-blue-100 mb-1">Preview Cliente</p>
                          <h5 className="text-2xl font-extrabold leading-tight">Lavandaria GenOmni</h5>
                          <p className="text-sm text-blue-100">Gestão inteligente para lavandarias modernas</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                        Página Sobre
                      </div>
                      <div className="p-4 space-y-3 max-h-56 overflow-auto">
                        <h5 className="text-lg font-bold text-[#0e2a47]">Sobre a GenOmni</h5>
                        <p className="text-sm text-slate-600">{institutionalData.aboutStory || 'Sem história definida.'}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-slate-50 p-2">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase">Missão</p>
                            <p className="text-xs text-slate-700 mt-1">{institutionalData.aboutMission || 'Sem missão.'}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase">Visão</p>
                            <p className="text-xs text-slate-700 mt-1">{institutionalData.aboutVision || 'Sem visão.'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(institutionalData.aboutTeam || []).slice(0, 4).map((member, index) => (
                            <div key={`${member.name}-${index}`} className="rounded-lg border border-slate-200 p-2">
                              <p className="text-xs font-semibold text-slate-800 truncate">{member.name || 'Sem nome'}</p>
                              <p className="text-[11px] text-slate-500 truncate">{member.role || 'Sem cargo'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">Equipa Técnica (institucional)</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setInstitutionalData((prev) =>
                          prev
                            ? {
                                ...prev,
                                aboutTeam: [...(prev.aboutTeam || []), { name: '', role: '', photo: '' }],
                              }
                            : prev,
                        )
                      }
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#0e2a47]"
                    >
                      <Plus className="w-4 h-4" />
                      adicionar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(institutionalData.aboutTeam || []).map((member, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100">
                            {member.photo ? <img src={member.photo} alt={member.name || 'Foto'} className="w-full h-full object-cover" /> : null}
                          </div>
                          <label className="text-xs font-semibold text-[#0e2a47] inline-flex items-center gap-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            Foto
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const image = await fileToOptimizedDataUrl(file, { maxWidth: 512, maxHeight: 512, quality: 0.78 });
                                  setInstitutionalData((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          aboutTeam: (prev.aboutTeam || []).map((m, idx) =>
                                            idx === index ? { ...m, photo: image } : m,
                                          ),
                                        }
                                      : prev,
                                  );
                                } catch (error) {
                                  showPanelNotice('error', toUserErrorMessage(error, 'Não foi possível processar a imagem.'));
                                }
                              }}
                            />
                          </label>
                        </div>
                        <input
                          value={member.name}
                          onChange={(e) =>
                            setInstitutionalData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    aboutTeam: (prev.aboutTeam || []).map((m, idx) =>
                                      idx === index ? { ...m, name: e.target.value } : m,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          placeholder="Nome"
                        />
                        <input
                          value={member.role}
                          onChange={(e) =>
                            setInstitutionalData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    aboutTeam: (prev.aboutTeam || []).map((m, idx) =>
                                      idx === index ? { ...m, role: e.target.value } : m,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                          placeholder="Cargo"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setInstitutionalData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    aboutTeam: (prev.aboutTeam || []).filter((_, idx) => idx !== index),
                                  }
                                : prev,
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInstitutionalSave}
                  disabled={institutionalSaving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0e2a47] hover:bg-[#12345a] text-white font-semibold disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {institutionalSaving ? 'Salvando...' : 'Guardar conteúdo institucional'}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Gestão de Utilizadores</h2>
            <div className="card-modern overflow-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b"><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Papel</th><th className="p-3">Ações</th></tr></thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.platformRole ?? '-'}</td>
                      <td className="p-3 flex gap-2">
                        <button className="px-3 py-1 rounded border" onClick={async () => { await adminBlockUser(token, u.id); await loadAll(token); }}>Bloquear</button>
                        <button className="px-3 py-1 rounded border" onClick={async () => {
                          const res = await adminResetPassword(token, u.id);
                          if (navigator?.clipboard?.writeText) {
                            try {
                              await navigator.clipboard.writeText(res.resetToken);
                            } catch {
                              // no-op
                            }
                          }
                          showPanelNotice('info', `Token de reset gerado: ${res.resetToken}`);
                        }}>Redefinir senha</button>
                        <button className="px-3 py-1 rounded border" onClick={async () => {
                          const res = await adminImpersonate(token, u.id);
                          if (navigator?.clipboard?.writeText) {
                            try {
                              await navigator.clipboard.writeText(res.token);
                            } catch {
                              // no-op
                            }
                          }
                          showPanelNotice('info', `Token de impersonação gerado: ${res.token}`);
                        }}>Impersonar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="p-4 text-sm text-slate-400">Sem utilizadores para este filtro.</p>}
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Auditoria</h2>
            <div className="card-modern overflow-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b"><th className="p-3">Ação</th><th className="p-3">Administrador</th><th className="p-3">Alvo</th><th className="p-3">Data</th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="p-3">{l.action}</td>
                      <td className="p-3">{l.adminId ?? '-'}</td>
                      <td className="p-3">{l.targetId ?? '-'}</td>
                      <td className="p-3">{new Date(l.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
