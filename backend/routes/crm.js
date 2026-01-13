
const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticarToken } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/checkPermission');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/deals/:id/attachments', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM crm_attachments WHERE deal_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar anexos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar anexos.' });
  }
});

router.post('/deals/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ mensagem: 'Nenhum arquivo enviado.' });
    }

    const result = await db.query(
      `INSERT INTO crm_attachments (deal_id, file_name, file_path, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, file.originalname, file.path, file.mimetype, file.size]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao salvar anexo:', error);
    res.status(500).json({ mensagem: 'Erro ao salvar anexo.' });
  }
});

router.delete('/attachments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const fileResult = await db.query('SELECT * FROM crm_attachments WHERE id = $1', [id]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Anexo não encontrado.' });
    }

    const file = fileResult.rows[0];

    await db.query('DELETE FROM crm_attachments WHERE id = $1', [id]);

    try {
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }
    } catch (err) {
      console.error('Erro ao apagar arquivo físico:', err);
    }

    res.json({ mensagem: 'Anexo excluído.' });
  } catch (error) {
    console.error('Erro ao excluir anexo:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir anexo.' });
  }
});

router.get('/attachments/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM crm_attachments WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Anexo não encontrado.' });
    }

    const file = result.rows[0];

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ mensagem: 'Arquivo físico não encontrado.' });
    }

    if (file.file_type) {
      res.setHeader('Content-Type', file.file_type);
    }

    res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);

    res.sendFile(path.resolve(file.file_path));

  } catch (error) {
    console.error('Erro ao baixar anexo:', error);
    res.status(500).json({ mensagem: 'Erro ao baixar anexo.' });
  }
});

router.post('/deals/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ mensagem: 'Comentário é obrigatório.' });
    }
    const result = await db.query(
      `INSERT INTO crm_comments (deal_id, comment, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, deal_id, comment, created_at, updated_at`,
      [id, comment.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao adicionar comentário ao deal:', error);
    res.status(500).json({ mensagem: 'Erro ao adicionar comentário.' });
  }
});

router.get('/deals/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, deal_id, comment, created_at, updated_at FROM crm_comments WHERE deal_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar comentários do deal:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar comentários.' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM crm_comments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Comentário não encontrado.' });
    }

    res.json({ mensagem: 'Comentário excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir comentário.' });
  }
});


router.put('/deals/:id/labels', async (req, res) => {
  try {
    const { id } = req.params;
    const { labels } = req.body;
    if (!Array.isArray(labels)) {
      return res.status(400).json({ mensagem: 'Labels deve ser um array.' });
    }
    const result = await db.query(
      `UPDATE crm_deals SET labels = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(labels), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Deal não encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar etiquetas do deal:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar etiquetas.' });
  }
});


router.use(autenticarToken);
router.use(checkPermission('CRM'));

router.get('/deals', async (req, res) => {
  try {
    const idVendedorBling = req.usuario.id_vendedor_bling;
    const tipoUsuario = req.usuario.tipo;

    const firstColResult = await db.query(
      `SELECT title FROM crm_columns WHERE user_id = $1 ORDER BY position ASC LIMIT 1`,
      [req.usuario.id]
    );
    const defaultColumn = firstColResult.rows.length > 0 ? firstColResult.rows[0].title : 'Novos Leads';

    let query;
    let params;

    const orderBy = `ORDER BY column_status, position ASC, c.nome ASC`;

    if (tipoUsuario === 'admin') {
      query = `
        SELECT 
          d.id AS deal_id,
          c.id AS client_id,
          c.nome AS client_name,
          c.email AS client_email,
          c.fone AS client_phone,
          COALESCE(d.column_status, $1) AS column_status,
          COALESCE(d.position, 0) AS position, -- Mantemos 0 padrão
          d.labels,
          d.description,
          (SELECT COUNT(*)::int FROM crm_attachments WHERE deal_id = d.id) AS total_attachments,
          (SELECT COUNT(*)::int FROM crm_comments WHERE deal_id = d.id) AS total_comments,
          c.data_cadastro AS created_at
        FROM cache_clientes c
        LEFT JOIN crm_deals d ON d.client_id = c.id
        ${orderBy}
      `;
      params = [defaultColumn];
    } else {
      query = `
        SELECT 
          d.id AS deal_id,
          c.id AS client_id,
          c.nome AS client_name,
          c.email AS client_email,
          c.fone AS client_phone,
          COALESCE(d.column_status, $1) AS column_status,
          COALESCE(d.position, 0) AS position, -- Mantemos 0 padrão
          d.labels,
          d.description,
          (SELECT COUNT(*)::int FROM crm_attachments WHERE deal_id = d.id) AS total_attachments,
          (SELECT COUNT(*)::int FROM crm_comments WHERE deal_id = d.id) AS total_comments,
          c.data_cadastro AS created_at
        FROM cache_clientes c
        LEFT JOIN crm_deals d ON d.client_id = c.id
        WHERE c.vendedor_id = $2
        ${orderBy}
      `;
      params = [defaultColumn, idVendedorBling];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar deals:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar oportunidades.' });
  }
});

router.post('/deals', async (req, res) => {
  try {
    const { client_name, client_email } = req.body;

    if (!client_name) {
      return res.status(400).json({ mensagem: 'O nome do cliente é obrigatório.' });
    }

    const result = await db.query(
      `INSERT INTO crm_deals (user_id, client_name, client_email, column_status, position)
       VALUES ($1, $2, $3, 'Novos Leads', 0)
       RETURNING *`,
      [req.usuario.id, client_name, client_email || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar deal:', error);
    res.status(500).json({ mensagem: 'Erro ao criar deal.' });
  }
});

router.put('/deals/:id/move', async (req, res) => {
  const { id } = req.params;
  const { column_status, position: newPosition } = req.body;

  if (!column_status || newPosition === undefined) {
    return res.status(400).json({ mensagem: 'Dados incompletos.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const currentRes = await client.query(
      'SELECT position, column_status FROM crm_deals WHERE client_id = $1',
      [id]
    );

    if (currentRes.rows.length === 0) {
      await client.query(
        `UPDATE crm_deals 
         SET position = position + 1 
         WHERE column_status = $1 
         AND position >= $2`,
        [column_status, newPosition]
      );

      const insertRes = await client.query(
        `INSERT INTO crm_deals (client_id, column_status, position, user_id, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [id, column_status, newPosition, req.usuario.id] 
      );

      await client.query('COMMIT');
      return res.json(insertRes.rows[0]);
    }

    const oldPosition = currentRes.rows[0].position;
    const oldColumn = currentRes.rows[0].column_status;

    if (oldColumn === column_status) {
      if (newPosition > oldPosition) {
        await client.query(
          `UPDATE crm_deals SET position = position - 1 
           WHERE column_status = $1 AND position > $2 AND position <= $3`,
          [column_status, oldPosition, newPosition]
        );
      } else if (newPosition < oldPosition) {
        await client.query(
          `UPDATE crm_deals SET position = position + 1 
           WHERE column_status = $1 AND position >= $2 AND position < $3`,
          [column_status, newPosition, oldPosition]
        );
      }
    } else {
      await client.query(
        `UPDATE crm_deals SET position = position - 1 
         WHERE column_status = $1 AND position > $2`,
        [oldColumn, oldPosition]
      );
      await client.query(
        `UPDATE crm_deals SET position = position + 1 
         WHERE column_status = $1 AND position >= $2`,
        [column_status, newPosition]
      );
    }

    const updateRes = await client.query(
      `UPDATE crm_deals 
       SET column_status = $1, position = $2, updated_at = NOW()
       WHERE client_id = $3
       RETURNING *`,
      [column_status, newPosition, id]
    );

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao mover card:', error);
    res.status(500).json({ mensagem: 'Erro ao mover card.' });
  } finally {
    client.release();
  }
});

router.delete('/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM crm_deals WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Card não encontrado.' });
    }

    res.json({ mensagem: 'Card excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir card:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir card.' });
  }
});

router.get('/columns', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, position 
       FROM crm_columns 
       WHERE user_id = $1 
       ORDER BY position ASC`,
      [req.usuario.id]
    );

    if (result.rows.length === 0) {
      const defaultColumns = [
        { title: 'Novos Leads', position: 0 },
        { title: 'Em contato', position: 1 },
        { title: 'Proposta enviada', position: 2 },
        { title: 'Negociação', position: 3 },
        { title: 'Fechado', position: 4 },
      ];

      const insertedColumns = [];
      for (const col of defaultColumns) {
        const insertResult = await db.query(
          `INSERT INTO crm_columns (user_id, title, position)
           VALUES ($1, $2, $3)
           RETURNING id, title, position`,
          [req.usuario.id, col.title, col.position]
        );
        insertedColumns.push(insertResult.rows[0]);
      }

      return res.json(insertedColumns);
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar colunas:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar colunas.' });
  }
});

router.post('/columns', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ mensagem: 'O título da coluna é obrigatório.' });
    }

    const maxPosResult = await db.query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM crm_columns WHERE user_id = $1',
      [req.usuario.id]
    );
    const newPosition = maxPosResult.rows[0].max_pos + 1;

    const result = await db.query(
      `INSERT INTO crm_columns (user_id, title, position)
       VALUES ($1, $2, $3)
       RETURNING id, title, position`,
      [req.usuario.id, title, newPosition]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar coluna:', error);
    res.status(500).json({ mensagem: 'Erro ao criar coluna.' });
  }
});

router.put('/columns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const oldColumnResult = await db.query(
      'SELECT title FROM crm_columns WHERE id = $1 AND user_id = $2',
      [id, req.usuario.id]
    );

    if (oldColumnResult.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Coluna não encontrada.' });
    }

    const oldTitle = oldColumnResult.rows[0].title;

    const result = await db.query(
      `UPDATE crm_columns 
       SET title = COALESCE($1, title), 
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, title, position`,
      [title, id, req.usuario.id]
    );

    if (title && title !== oldTitle) {
      await db.query(
        `UPDATE crm_deals 
         SET column_status = $1 
         WHERE column_status = $2 AND user_id = $3`,
        [title, oldTitle, req.usuario.id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar coluna:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar coluna.' });
  }
});

router.delete('/columns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const columnResult = await db.query(
      'SELECT title FROM crm_columns WHERE id = $1 AND user_id = $2',
      [id, req.usuario.id]
    );

    if (columnResult.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Coluna não encontrada.' });
    }

    const columnTitle = columnResult.rows[0].title;

    const firstColumnResult = await db.query(
      `SELECT title FROM crm_columns 
       WHERE user_id = $1 AND id != $2 
       ORDER BY position ASC LIMIT 1`,
      [req.usuario.id, id]
    );

    if (firstColumnResult.rows.length > 0) {
      await db.query(
        `UPDATE crm_deals SET column_status = $1 WHERE column_status = $2`,
        [firstColumnResult.rows[0].title, columnTitle]
      );
    }

    await db.query(
      'DELETE FROM crm_columns WHERE id = $1 AND user_id = $2',
      [id, req.usuario.id]
    );

    res.json({ mensagem: 'Coluna excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir coluna:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir coluna.' });
  }
});

router.put('/columns/reorder', async (req, res) => {
  try {
    const { columns } = req.body;

    if (!columns || !Array.isArray(columns)) {
      return res.status(400).json({ mensagem: 'Dados inválidos.' });
    }

    for (const col of columns) {
      await db.query(
        'UPDATE crm_columns SET position = $1 WHERE id = $2 AND user_id = $3',
        [col.position, col.id, req.usuario.id]
      );
    }

    res.json({ mensagem: 'Colunas reordenadas com sucesso.' });
  } catch (error) {
    console.error('Erro ao reordenar colunas:', error);
    res.status(500).json({ mensagem: 'Erro ao reordenar colunas.' });
  }
});

router.put('/deals/:id/description', async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    const result = await db.query(
      `UPDATE crm_deals SET description = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Deal não encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar descrição:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar descrição.' });
  }
});

router.post('/deals/ensure', async (req, res) => {
  const client = await pool.connect();
  try {
    const { client_id } = req.body;
    const userId = req.usuario.id;

    const check = await client.query('SELECT id FROM crm_deals WHERE client_id = $1', [client_id]);
    
    if (check.rows.length > 0) {
      return res.json({ deal_id: check.rows[0].id, is_new: false });
    }

    const colResult = await client.query(
      'SELECT title FROM crm_columns WHERE user_id = $1 ORDER BY position ASC LIMIT 1',
      [userId]
    );
    const defaultColumn = colResult.rows.length > 0 ? colResult.rows[0].title : 'Novos Leads';

    const insert = await client.query(
      `INSERT INTO crm_deals (client_id, column_status, position, user_id, created_at) 
       VALUES ($1, $2, 0, $3, NOW()) 
       RETURNING id`,
      [client_id, defaultColumn, userId]
    );

    return res.json({ deal_id: insert.rows[0].id, is_new: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar deal.' });
  } finally {
    client.release();
  }
});

module.exports = router;