
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  password: 'password',
  role: 'role',
  tipo: 'tipo',
  full_name: 'full_name',
  cpf_cnpj: 'cpf_cnpj',
  telefone: 'telefone',
  cep: 'cep',
  logradouro: 'logradouro',
  numero: 'numero',
  complemento: 'complemento',
  bairro_end: 'bairro_end',
  cidade: 'cidade',
  estado_end: 'estado_end',
  photo: 'photo',
  repCode: 'repCode',
  colorIndex: 'colorIndex',
  comissao: 'comissao',
  isVago: 'isVago',
  created_at: 'created_at',
  default_workspace: 'default_workspace',
  inactivity_limit: 'inactivity_limit',
  notif_email: 'notif_email',
  notif_sms: 'notif_sms',
  notif_push: 'notif_push',
  last_active: 'last_active',
  token_version: 'token_version'
};

exports.Prisma.ModuleScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.UserPermissionScalarFieldEnum = {
  userId: 'userId',
  moduleId: 'moduleId',
  canView: 'canView',
  canEdit: 'canEdit'
};

exports.Prisma.TerritoryScalarFieldEnum = {
  id: 'id',
  municipio: 'municipio',
  uf: 'uf',
  modo: 'modo',
  repCode: 'repCode'
};

exports.Prisma.BairroScalarFieldEnum = {
  id: 'id',
  bairro: 'bairro',
  regiao: 'regiao',
  municipio: 'municipio',
  uf: 'uf',
  modo: 'modo',
  repCode: 'repCode'
};

exports.Prisma.InterestRequestScalarFieldEnum = {
  id: 'id',
  nome: 'nome',
  email: 'email',
  telefone: 'telefone',
  empresa: 'empresa',
  municipio: 'municipio',
  uf: 'uf',
  modo: 'modo',
  observacoes: 'observacoes',
  status: 'status',
  created_at: 'created_at'
};

exports.Prisma.UserActivityScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  details: 'details',
  ipAddress: 'ipAddress',
  timestamp: 'timestamp'
};

exports.Prisma.ClienteScalarFieldEnum = {
  id_cliente: 'id_cliente',
  codigo_cliente: 'codigo_cliente',
  nome_cliente: 'nome_cliente',
  nome_abreviado: 'nome_abreviado',
  regiao: 'regiao',
  uf: 'uf',
  cidade: 'cidade',
  bairro: 'bairro',
  cep: 'cep',
  endereco_completo: 'endereco_completo',
  cnpj: 'cnpj',
  latitude: 'latitude',
  longitude: 'longitude',
  status_ativo: 'status_ativo',
  data_cadastro: 'data_cadastro',
  data_atualizacao: 'data_atualizacao',
  supervisorName: 'supervisorName',
  classificacao: 'classificacao',
  semana: 'semana',
  prioridade: 'prioridade',
  repCode: 'repCode'
};

exports.Prisma.AlocacaoSupervisorScalarFieldEnum = {
  id_alocacao: 'id_alocacao',
  id_cliente: 'id_cliente',
  id_supervisor: 'id_supervisor',
  data_inicio: 'data_inicio',
  data_fim: 'data_fim'
};

exports.Prisma.ClassificacaoClienteScalarFieldEnum = {
  id_classificacao: 'id_classificacao',
  id_cliente: 'id_cliente',
  classificacao: 'classificacao',
  data_classificacao: 'data_classificacao',
  responsavel: 'responsavel',
  observacoes: 'observacoes'
};

exports.Prisma.PlanejamentoVisitasScalarFieldEnum = {
  id_visita: 'id_visita',
  id_cliente: 'id_cliente',
  id_supervisor: 'id_supervisor',
  semana: 'semana',
  data_visita_prevista: 'data_visita_prevista',
  prioridade: 'prioridade',
  status: 'status',
  observacoes: 'observacoes'
};

exports.Prisma.DistanciasLogisticaScalarFieldEnum = {
  id_distancia: 'id_distancia',
  id_cliente: 'id_cliente',
  id_supervisor: 'id_supervisor',
  distancia_km: 'distancia_km',
  modo_transporte: 'modo_transporte',
  tempo_estimado_horas: 'tempo_estimado_horas',
  data_calculo: 'data_calculo'
};

exports.Prisma.BlocosViagemScalarFieldEnum = {
  id_bloco: 'id_bloco',
  codigo_bloco: 'codigo_bloco',
  id_supervisor: 'id_supervisor',
  uf: 'uf',
  semana: 'semana',
  total_clientes: 'total_clientes',
  estrategicos: 'estrategicos',
  km_estimado: 'km_estimado',
  prioridade: 'prioridade',
  data_criacao: 'data_criacao'
};

exports.Prisma.ClustersCidadesScalarFieldEnum = {
  id_cluster: 'id_cluster',
  uf: 'uf',
  cidade: 'cidade',
  tipo_cluster: 'tipo_cluster',
  total_clientes: 'total_clientes',
  densidade: 'densidade',
  supervisor_principal: 'supervisor_principal',
  latitude: 'latitude',
  longitude: 'longitude',
  data_analise: 'data_analise'
};

exports.Prisma.HistoricoVisitasScalarFieldEnum = {
  id_historico: 'id_historico',
  id_cliente: 'id_cliente',
  id_supervisor: 'id_supervisor',
  data_visita: 'data_visita',
  resultado: 'resultado',
  valor_negocio: 'valor_negocio',
  proximo_contato: 'proximo_contato',
  observacoes: 'observacoes'
};

exports.Prisma.ConfigSistemaScalarFieldEnum = {
  id_config: 'id_config',
  parametro: 'parametro',
  valor: 'valor',
  descricao: 'descricao',
  data_atualizacao: 'data_atualizacao'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Module: 'Module',
  UserPermission: 'UserPermission',
  Territory: 'Territory',
  Bairro: 'Bairro',
  InterestRequest: 'InterestRequest',
  UserActivity: 'UserActivity',
  Cliente: 'Cliente',
  AlocacaoSupervisor: 'AlocacaoSupervisor',
  ClassificacaoCliente: 'ClassificacaoCliente',
  PlanejamentoVisitas: 'PlanejamentoVisitas',
  DistanciasLogistica: 'DistanciasLogistica',
  BlocosViagem: 'BlocosViagem',
  ClustersCidades: 'ClustersCidades',
  HistoricoVisitas: 'HistoricoVisitas',
  ConfigSistema: 'ConfigSistema'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
