-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "tipo" TEXT NOT NULL DEFAULT 'representante',
    "full_name" TEXT,
    "cpf_cnpj" TEXT,
    "telefone" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro_end" TEXT,
    "cidade" TEXT,
    "estado_end" TEXT,
    "photo" TEXT,
    "repCode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "default_workspace" TEXT DEFAULT 'admin',
    "inactivity_limit" INTEGER DEFAULT 30,
    "notif_email" BOOLEAN NOT NULL DEFAULT true,
    "notif_sms" BOOLEAN NOT NULL DEFAULT false,
    "notif_push" BOOLEAN NOT NULL DEFAULT true,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "userId" INTEGER NOT NULL,
    "moduleId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("userId","moduleId")
);

-- CreateTable
CREATE TABLE "representatives" (
    "code" TEXT NOT NULL,
    "name" TEXT,
    "fullName" TEXT,
    "email" TEXT,
    "contato" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "comissao" DOUBLE PRECISION,
    "isVago" INTEGER NOT NULL DEFAULT 0,
    "colorIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "representatives_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "territories" (
    "id" SERIAL NOT NULL,
    "municipio" TEXT,
    "uf" TEXT,
    "modo" TEXT,
    "repCode" TEXT,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bairros" (
    "id" SERIAL NOT NULL,
    "bairro" TEXT,
    "regiao" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "modo" TEXT,
    "repCode" TEXT,

    CONSTRAINT "bairros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_requests" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "empresa" TEXT,
    "municipio" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "modo" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id_cliente" SERIAL NOT NULL,
    "codigo_cliente" TEXT,
    "nome_cliente" TEXT NOT NULL,
    "nome_abreviado" TEXT,
    "regiao" TEXT,
    "uf" TEXT,
    "cidade" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "endereco_completo" TEXT,
    "cnpj" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status_ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,
    "supervisorName" TEXT,
    "classificacao" TEXT,
    "semana" TEXT,
    "prioridade" TEXT,
    "repCode" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "alocacao_supervisor" (
    "id_alocacao" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_supervisor" INTEGER NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3),

    CONSTRAINT "alocacao_supervisor_pkey" PRIMARY KEY ("id_alocacao")
);

-- CreateTable
CREATE TABLE "classificacao_cliente" (
    "id_classificacao" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "classificacao" TEXT,
    "data_classificacao" TIMESTAMP(3) NOT NULL,
    "responsavel" TEXT,
    "observacoes" TEXT,

    CONSTRAINT "classificacao_cliente_pkey" PRIMARY KEY ("id_classificacao")
);

-- CreateTable
CREATE TABLE "planejamento_visitas" (
    "id_visita" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_supervisor" INTEGER NOT NULL,
    "semana" TEXT,
    "data_visita_prevista" TIMESTAMP(3),
    "prioridade" TEXT,
    "status" TEXT DEFAULT 'Planejado',
    "observacoes" TEXT,

    CONSTRAINT "planejamento_visitas_pkey" PRIMARY KEY ("id_visita")
);

-- CreateTable
CREATE TABLE "distancias_logistica" (
    "id_distancia" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_supervisor" INTEGER NOT NULL,
    "distancia_km" DOUBLE PRECISION,
    "modo_transporte" TEXT,
    "tempo_estimado_horas" DOUBLE PRECISION,
    "data_calculo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distancias_logistica_pkey" PRIMARY KEY ("id_distancia")
);

-- CreateTable
CREATE TABLE "blocos_viagem" (
    "id_bloco" SERIAL NOT NULL,
    "codigo_bloco" TEXT,
    "id_supervisor" INTEGER NOT NULL,
    "uf" TEXT,
    "semana" TEXT,
    "total_clientes" INTEGER,
    "estrategicos" INTEGER,
    "km_estimado" DOUBLE PRECISION,
    "prioridade" TEXT,
    "data_criacao" TIMESTAMP(3),

    CONSTRAINT "blocos_viagem_pkey" PRIMARY KEY ("id_bloco")
);

-- CreateTable
CREATE TABLE "clusters_cidades" (
    "id_cluster" SERIAL NOT NULL,
    "uf" TEXT,
    "cidade" TEXT,
    "tipo_cluster" TEXT,
    "total_clientes" INTEGER,
    "densidade" DOUBLE PRECISION,
    "supervisor_principal" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "data_analise" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clusters_cidades_pkey" PRIMARY KEY ("id_cluster")
);

-- CreateTable
CREATE TABLE "historico_visitas" (
    "id_historico" SERIAL NOT NULL,
    "id_cliente" INTEGER NOT NULL,
    "id_supervisor" INTEGER NOT NULL,
    "data_visita" TIMESTAMP(3),
    "resultado" TEXT,
    "valor_negocio" DOUBLE PRECISION,
    "proximo_contato" TIMESTAMP(3),
    "observacoes" TEXT,

    CONSTRAINT "historico_visitas_pkey" PRIMARY KEY ("id_historico")
);

-- CreateTable
CREATE TABLE "config_sistema" (
    "id_config" SERIAL NOT NULL,
    "parametro" TEXT NOT NULL,
    "valor" TEXT,
    "descricao" TEXT,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_sistema_pkey" PRIMARY KEY ("id_config")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_repCode_idx" ON "users"("repCode");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_codigo_cliente_key" ON "clientes"("codigo_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "alocacao_supervisor_id_cliente_id_supervisor_data_inicio_key" ON "alocacao_supervisor"("id_cliente", "id_supervisor", "data_inicio");

-- CreateIndex
CREATE UNIQUE INDEX "blocos_viagem_codigo_bloco_key" ON "blocos_viagem"("codigo_bloco");

-- CreateIndex
CREATE UNIQUE INDEX "config_sistema_parametro_key" ON "config_sistema"("parametro");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_repCode_fkey" FOREIGN KEY ("repCode") REFERENCES "representatives"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_repCode_fkey" FOREIGN KEY ("repCode") REFERENCES "representatives"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bairros" ADD CONSTRAINT "bairros_repCode_fkey" FOREIGN KEY ("repCode") REFERENCES "representatives"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_repCode_fkey" FOREIGN KEY ("repCode") REFERENCES "representatives"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacao_supervisor" ADD CONSTRAINT "alocacao_supervisor_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacao_supervisor" ADD CONSTRAINT "alocacao_supervisor_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classificacao_cliente" ADD CONSTRAINT "classificacao_cliente_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamento_visitas" ADD CONSTRAINT "planejamento_visitas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planejamento_visitas" ADD CONSTRAINT "planejamento_visitas_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distancias_logistica" ADD CONSTRAINT "distancias_logistica_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distancias_logistica" ADD CONSTRAINT "distancias_logistica_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocos_viagem" ADD CONSTRAINT "blocos_viagem_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_visitas" ADD CONSTRAINT "historico_visitas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_visitas" ADD CONSTRAINT "historico_visitas_id_supervisor_fkey" FOREIGN KEY ("id_supervisor") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
