const multer = require('multer');
const pdfParse = require('pdf-parse');
const supabase = require('../db/supabase');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  }
});

const aiDocumentController = {
  uploadMiddleware: upload.single('document'),
  
  processDocument: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const pdfBuffer = req.file.buffer;
      const pdfData = await pdfParse(pdfBuffer);
      const extractedText = pdfData.text;
      
      if (!extractedText || extractedText.length < 50) {
        return res.status(400).json({ error: 'Não foi possível extrair texto do PDF' });
      }

      const aiAnalysis = await analyzeWithAI(extractedText, req.userId);
      
      if (!aiAnalysis.success) {
        return res.status(400).json({ error: aiAnalysis.error });
      }

      const results = await saveExtractedData(req.userId, aiAnalysis.data);
      
      res.json({
        success: true,
        message: aiAnalysis.message,
        summary: aiAnalysis.summary,
        extracted: aiAnalysis.data,
        saved: results,
        preview: extractedText.substring(0, 500)
      });
      
    } catch (err) {
      console.error('Process document error:', err);
      res.status(500).json({ error: 'Erro ao processar documento: ' + err.message });
    }
  },
  
  processDocumentUrl: async (req, res) => {
    try {
      const { fileUrl } = req.body;
      if (!fileUrl) {
        return res.status(400).json({ error: 'URL do arquivo é obrigatória' });
      }
      
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      
      const pdfData = await pdfParse(Buffer.from(buffer));
      const extractedText = pdfData.text;
      
      const aiAnalysis = await analyzeWithAI(extractedText, req.userId);
      
      const results = await saveExtractedData(req.userId, aiAnalysis.data);
      
      res.json({
        success: true,
        message: aiAnalysis.message,
        summary: aiAnalysis.summary,
        extracted: aiAnalysis.data,
        saved: results
      });
    } catch (err) {
      console.error('Process document URL error:', err);
      res.status(500).json({ error: 'Erro ao processar documento: ' + err.message });
    }
  }
};

async function analyzeWithAI(text, userId) {
  const { data: user } = await supabase
    .from('users')
    .select('salary, name')
    .eq('id', userId)
    .single();
  
  const systemPrompt = `Você é o Tobby IA, um assistente financeiro especializado em analisar documentos financeiros.

Analise o texto do documento fornecido e extraia TODAS as informações relevantes:

1. **Se for HOLERITE/CONTRACHEQUE:**
   - Salário bruto
   - Salário líquido
   - Descontos (INSS, IRRF, Vale Transporte, Vale Refeição, Plano de Saúde)
   - Bônus/Adicionais

2. **Se for EXTRATO BANCÁRIO:**
   - Lista de transações (data, descrição, valor)
   - Despesas recorrentes
   - Receitas

3. **Se for NOTA FISCAL:**
   - Produtos comprados
   - Valores
   - Data da compra

Responda APENAS com um JSON válido no seguinte formato:
{
  "documentType": "holerite|extrato|notaFiscal|desconhecido",
  "confidence": 0.0-1.0,
  "summary": {
    "title": "resumo curto",
    "description": "descrição detalhada"
  },
  "data": {
    "salary": 0,
    "netSalary": 0,
    "discounts": [
      { "name": "INSS", "value": 0 },
      { "name": "IRRF", "value": 0 }
    ],
    "bills": [
      { "name": "nome da conta", "value": 0, "category": "categoria", "due_day": 5 }
    ],
    "transactions": [],
    "totalValue": 0
  }
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20241022',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Analise este documento financeiro e extraia as informações:\n\n${text.substring(0, 15000)}`
        }]
      })
    });
    
    const data = await response.json();
    const content = data.content[0].text;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('IA não retornou JSON válido');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    let message = '';
    if (analysis.documentType === 'holerite') {
      message = `📄 Holerite processado! Salário: R$ ${analysis.data.salary?.toFixed(2) || '0'}`;
    } else if (analysis.documentType === 'extrato') {
      message = `🏦 Extrato processado! ${analysis.data.bills?.length || 0} novas transações identificadas.`;
    } else if (analysis.documentType === 'notaFiscal') {
      message = `🧾 Nota fiscal processada! Total: R$ ${analysis.data.totalValue?.toFixed(2) || '0'}`;
    } else {
      message = `📄 Documento analisado. ${analysis.data.bills?.length || 0} itens identificados.`;
    }
    
    return {
      success: true,
      message: message,
      summary: analysis.summary,
      data: analysis.data
    };
    
  } catch (err) {
    console.error('AI Analysis error:', err);
    return {
      success: false,
      error: 'Erro na análise da IA: ' + err.message
    };
  }
}

async function saveExtractedData(userId, data) {
  const results = { bills: [], salaryUpdated: false };
  
  if (data.salary && data.salary > 0) {
    await supabase
      .from('users')
      .update({ salary: data.salary })
      .eq('id', userId);
    results.salaryUpdated = true;
  }
  
  if (data.bills && data.bills.length > 0) {
    for (const bill of data.bills) {
      if (bill.name && bill.value > 0) {
        const { data: saved } = await supabase
          .from('bills')
          .insert({
            user_id: userId,
            name: bill.name,
            value: bill.value,
            due_day: bill.due_day || 5,
            category: bill.category || 'outros',
            status: 'pending'
          })
          .select()
          .single();
        if (saved) results.bills.push(saved);
      }
    }
  }
  
  return results;
}

module.exports = aiDocumentController;