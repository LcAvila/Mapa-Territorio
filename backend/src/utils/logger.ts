import { prisma } from '../prisma';
import { Request } from 'express';

/**
 * Registra uma atividade do usuário no banco de dados.
 * @param userId ID do usuário que realizou a ação
 * @param action Tipo da ação (login, profile_update, etc)
 * @param details Descrição amigável da ação
 * @param req Objeto de requisição Express (para capturar IP)
 * @param entity Nome da entidade afetada (opcional)
 * @param entityId ID da entidade afetada (opcional)
 */
export async function logUserActivity(
  userId: number,
  action: string,
  details: string,
  req?: Request,
  entity?: string,
  entityId?: string
) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress : null;

    const activity = await prisma.userActivity.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
        entity,
        entityId: entityId ? String(entityId) : null,
      },
    });

    return activity;
  } catch (error) {
    console.error('Erro ao registrar atividade do usuário:', error);
    // Não lançamos o erro para não quebrar a requisição principal
  }
}
