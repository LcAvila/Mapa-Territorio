import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// GET /api/feed - Listar posts do feed
router.get('/', async (req, res) => {
  try {
    const posts = await prisma.feedPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, full_name: true, username: true, photo: true, tipo: true } },
        comments: {
          include: {
            user: { select: { id: true, full_name: true, username: true, photo: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        reactions: true
      }
    });

    res.json(posts);
  } catch (error) {
    console.error('Erro ao buscar feed:', error);
    res.status(500).json({ message: 'Erro ao buscar o feed.' });
  }
});

// POST /api/feed/post - Criar um novo post
router.post('/post', async (req, res) => {
  try {
    const user = (req as any).user;
    const { content, image, sticker } = req.body;

    if (!content && !image && !sticker) {
      return res.status(400).json({ message: 'Post não pode estar vazio.' });
    }

    const post = await prisma.feedPost.create({
      data: {
        userId: user.id,
        content: content || '',
        image,
        sticker
      },
      include: {
        user: { select: { id: true, full_name: true, username: true, photo: true, tipo: true } },
        comments: true,
        reactions: true
      }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Erro ao criar post:', error);
    res.status(500).json({ message: 'Erro ao criar a postagem.' });
  }
});

// POST /api/feed/comment - Comentar em um post
router.post('/comment', async (req, res) => {
  try {
    const user = (req as any).user;
    const { postId, content, sticker } = req.body;

    if (!postId || (!content && !sticker)) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    const comment = await prisma.feedComment.create({
      data: {
        postId: Number(postId),
        userId: user.id,
        content: content || '',
        sticker
      },
      include: {
        user: { select: { id: true, full_name: true, username: true, photo: true } }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ message: 'Erro ao comentar na postagem.' });
  }
});

// POST /api/feed/react - Reagir a um post
router.post('/react', async (req, res) => {
  try {
    const user = (req as any).user;
    const { postId, emoji } = req.body;

    if (!postId || !emoji) {
      return res.status(400).json({ message: 'Dados inválidos.' });
    }

    const existing = await prisma.feedReaction.findUnique({
      where: {
        postId_userId_emoji: {
          postId: Number(postId),
          userId: user.id,
          emoji: String(emoji)
        }
      }
    });

    if (existing) {
      // Remove reaction (toggle)
      await prisma.feedReaction.delete({ where: { id: existing.id } });
      return res.json({ action: 'removed', reaction: existing });
    } else {
      const reaction = await prisma.feedReaction.create({
        data: {
          postId: Number(postId),
          userId: user.id,
          emoji: String(emoji)
        }
      });
      return res.json({ action: 'added', reaction });
    }
  } catch (error) {
    console.error('Erro ao reagir:', error);
    res.status(500).json({ message: 'Erro ao reagir à postagem.' });
  }
});

export default router;
