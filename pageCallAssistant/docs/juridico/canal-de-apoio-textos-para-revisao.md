# Textos do canal de apoio ao aluno para revisão jurídica

Este documento reúne, em um só lugar, os textos que a plataforma mostra a alunos, profissionais e gestores no canal de apoio ao aluno, e as leis que eles citam. Foi montado em 25/11/2026 para ser entregue ao corpo jurídico e ao encarregado de dados que forem responsáveis pela revisão.

**Situação: nenhum destes textos passou por revisão jurídica.** Foram escritos pela equipe de desenvolvimento. As leis foram citadas de memória e não foram conferidas na fonte oficial.

Quando um texto for alterado no sistema, este documento precisa ser atualizado. A origem de cada texto está indicada em cada seção.

## 1. O que se pede ao jurídico

- Conferir, na fonte oficial, cada lei e artigo citados na seção 8, e dizer se a citação está correta e se cabe naquele contexto.
- Avaliar se o aviso ao aluno sobre quem lê o pedido é suficiente e honesto, em especial a frase de que a equipe pode precisar chamar outros adultos.
- Avaliar a base legal do tratamento dos dados do aluno neste canal (dados pessoais de criança e adolescente, possivelmente sensíveis) e o papel de cada parte: Secretaria como controladora, Codevelop como operadora.
- Dizer se é necessário algum consentimento ou ciência dos responsáveis para o canal existir, considerando que o pedido pode tratar de violência dentro de casa.
- Definir o prazo de guarda e a regra de exclusão dos pedidos, das gravações de voz e dos registros da equipe. Hoje ficam guardados sem prazo.
- Revisar as orientações à equipe (seção 4), que funcionam como protocolo de conduta, e dizer se devem ser substituídas pelo protocolo do município.
- Revisar o termo de sigilo e proteção de dados aceito pelo assistente social e pelo psicólogo (seção 5).
- Avaliar o documento de encaminhamento (seção 7): conteúdo mínimo, menção de sigilo e forma de entrega ao órgão.
- Avaliar se a conferência do registro profissional por declaração do gestor é suficiente para o assistente social, já que só o registro do psicólogo é consultado automaticamente.
- Avaliar a marcação "Não procede (brincadeira ou engano)" e se ela pode gerar algum efeito para o aluno.

## 2. O que o aluno lê

Origem: `app/(escola)/escola/aluno/apoio/page.tsx` e `lib/escola/apoio-aluno.ts`.

**Acesso, no fim da tela inicial do aluno**

> Precisa conversar com alguém?
> Peça ajuda a um adulto da equipe de apoio.

**Abertura da tela**

> Você pode contar aqui o que está te deixando triste, com medo ou preocupado.
> Pedir ajuda é um direito seu. Você não fez nada de errado.

**Quem vai ler**

> Só a equipe de apoio da Secretaria de Educação.
> Seus professores, seus colegas e sua família não veem o que você mandar por aqui.
> Para te proteger, essa equipe pode precisar chamar outros adultos que cuidam da segurança de crianças e adolescentes.

**Opções que o aluno escolhe ("O que você quer contar?")**

- Estou triste ou preocupado e quero conversar *(para a equipe aparece como: Quer conversar (tristeza ou preocupação))*
- Alguém está me machucando ou me deixando com medo *(para a equipe aparece como: Diz que alguém o machuca ou causa medo)*
- Está acontecendo algo ruim na minha casa *(para a equipe aparece como: Algo ruim em casa)*
- Está acontecendo algo ruim na escola *(para a equipe aparece como: Algo ruim na escola)*
- É outra coisa, ou prefiro não dizer agora *(para a equipe aparece como: Outro assunto ou preferiu não dizer)*

**Campo livre e gravação**

> Se quiser, conte com as suas palavras
> Não precisa explicar tudo. Escreva só o que conseguir. Pode deixar em branco.
> Ou grave a sua voz (até 2 minutos)

**Depois de enviar**

> Seu pedido chegou
> Você fez bem em pedir ajuda. Um adulto da equipe de apoio vai te procurar na escola assim que puder.
> O que você mandou não fica aparecendo neste aparelho.

**Situação que o aluno vê depois**: "Seu pedido chegou", "Um adulto está cuidando do seu pedido" ou "Pedido atendido". O aluno nunca vê o texto que enviou, a situação interna da equipe nem a marcação de "não procede".

**Aviso de emergência, sempre visível**

> Se você está em perigo agora
> Ligue 190.
> O Disque 100 atende todos os dias, a qualquer hora, e a ligação não é cobrada.
> Procure um adulto de confiança perto de você.

**Limite de envios**: cinco pedidos em 24 horas. Ao passar disso, o aluno lê: "Você já enviou alguns pedidos hoje e eles chegaram. Se for urgente, ligue 100 ou procure um adulto de confiança na escola."

## 3. O que a equipe de apoio lê ao entrar

Origem: `app/(escola)/escola/apoio/page.tsx`.

> Antes de agir
> Procure o aluno pessoalmente, em lugar reservado. Escute sem pressionar e não peça que ele repita o relato para várias pessoas.
> Não avise a família antes de avaliar o risco: quem causa o sofrimento pode estar em casa.
> Suspeita ou confirmação de maus-tratos deve ser comunicada ao Conselho Tutelar (Estatuto da Criança e do Adolescente, art. 13). O atendimento psicológico e social é da rede do município.
> Cada vez que um pedido é aberto, fica registrado quem abriu e quando.

## 4. Orientação à equipe, por tipo de pedido

Origem: `lib/escola/apoio-aluno.ts` (constantes `ORIENTACAO` e `ORIENTACAO_NAO_PROCEDE`). Texto copiado do código.

**Quando o aluno quer conversar**

1. Procure o aluno em lugar reservado, sem chamar na frente da turma.
2. Escute sem pressa e sem julgar. Não diga que é bobagem nem compare com outros casos.
3. Se ele falar em se machucar ou em não querer viver, não o deixe sozinho e acione a saúde do município no mesmo dia (UBS, CAPS ou SAMU 192).
4. Avise a família só quando ela for parte do cuidado, e combine antes com o aluno o que será dito.

**Quando o aluno diz que alguém o machuca ou causa medo**

1. Acolha e acredite. Agradeça por ele ter contado e diga que a culpa não é dele.
2. Não peça detalhes nem que ele repita o relato para várias pessoas. A escuta detalhada é de profissional preparado (Lei 13.431/2017).
3. Não confronte nem avise a pessoa apontada, mesmo que seja da família ou da escola.
4. Não prometa segredo. Explique que, para protegê-lo, outros adultos precisam saber.
5. Comunique o Conselho Tutelar (ECA, art. 13). Se houver risco imediato, ligue 190.

**Quando algo ruim acontece em casa**

1. Não avise a família antes de avaliar o risco: quem causa o sofrimento pode estar em casa.
2. Converse em lugar reservado e deixe o aluno contar do jeito dele, sem conduzir as respostas.
3. Havendo suspeita de violência ou negligência, comunique o Conselho Tutelar (ECA, art. 13).
4. Situações de fome, falta de moradia ou de cuidado pedem a assistência social do município (CRAS ou CREAS).

**Quando algo ruim acontece na escola**

1. Não exponha quem contou: trate o assunto sem citar o aluno para colegas ou para a turma.
2. Se envolve colegas, acione a coordenação para agir contra a intimidação (Lei 13.185/2015), protegendo o aluno.
3. Se envolve um adulto da escola, não avise o envolvido nem a direção local: leve direto à Secretaria e ao Conselho Tutelar.
4. Acompanhe o aluno nos dias seguintes para saber se a situação parou.

**Quando o aluno preferiu não dizer o assunto**

1. Procure o aluno em lugar reservado e diga que ele pode contar no tempo dele.
2. Não pressione. Às vezes o primeiro pedido é só para saber se será levado a sério.
3. Conforme o que ele contar, siga a orientação do assunto correspondente.

**Antes de marcar um pedido como "Não procede (brincadeira ou engano)"**

- Só marque depois de conversar pessoalmente com o aluno.
- Um pedido que parece brincadeira pode ser um teste para ver se alguém escuta. Não trate como indisciplina e não aplique punição.
- Se ficar alguma dúvida, mantenha em acompanhamento.

## 5. Termo de sigilo e proteção de dados do profissional

Origem: `lib/escola/apoio-profissional.ts` (constante `TERMO_ITENS`). Versão 2026-11-25. Texto copiado do código. É aceito pelo assistente social e pelo psicólogo antes do primeiro acesso, junto com os Termos de Uso gerais da plataforma.

1. **O que você vai acessar.** Pedidos de apoio feitos por alunos da rede: relatos escritos ou gravados, com nome, turma e escola. São dados pessoais de crianças e adolescentes e podem incluir dados sensíveis.
2. **Para que serve o acesso.** Só para acolher o aluno e encaminhar o caso dentro da sua função. Não use essas informações para nenhuma outra finalidade.
3. **Sigilo.** Não copie, fotografe, imprima sem necessidade nem compartilhe o que ler fora dos canais oficiais da rede de proteção. O sigilo continua valendo depois que o seu vínculo terminar e se soma ao sigilo do código de ética da sua profissão.
4. **Registro das suas ações.** Cada pedido que você abrir, cada mudança de situação, cada caso passado a um colega e cada documento gerado ficam registrados com o seu nome, a data e a hora.
5. **Quem responde pelos dados.** A Secretaria de Educação é a controladora dos dados e decide quem tem acesso. A Codevelop Solutions opera a plataforma em nome dela, conforme a Lei 13.709/2018 (LGPD). A plataforma é só o canal: o atendimento é da rede do município.
6. **Os seus dados.** A Secretaria informou o seu nome, e-mail, função, número de registro no conselho, UF e as escolas que você atende. Eles servem para identificar você, conferir a sua habilitação profissional e assinar os encaminhamentos. Também ficam guardados os seus registros de acesso.
7. **Os seus direitos.** Você pode pedir à Secretaria a confirmação, o acesso, a correção e a exclusão dos seus dados, como prevê a LGPD. Se não reconhece este cadastro ou não quer participar, recuse nesta mesma tela: o número do seu registro é apagado na hora e a Secretaria é avisada para excluir o restante.
8. **Dever de comunicar.** Suspeita ou confirmação de maus-tratos contra criança ou adolescente deve ser comunicada ao Conselho Tutelar, como determina o art. 13 do Estatuto da Criança e do Adolescente.

**Declaração do gestor ao cadastrar o profissional**

> Declaro que as informações são verdadeiras, que este profissional tem registro ativo no conselho e que está autorizado pela Secretaria a ler os pedidos de apoio dos alunos. Sei que esta declaração fica registrada no meu nome.

**Confirmações do profissional ao aceitar**

- Confirmo que os dados acima são meus e estão corretos.
- Li e aceito o termo de sigilo e proteção de dados.
- Li e aceito os Termos de Uso da plataforma.

**Recusa**

> Ao confirmar, o número do seu registro profissional é apagado na hora, este link deixa de valer e a Secretaria de Educação é avisada para excluir o restante do cadastro. Você não terá acesso à plataforma.

## 6. E-mails

Origem: `lib/escola/apoio-aluno.ts` e `lib/escola/apoio-profissional.ts`. Nenhum e-mail de pedido traz o nome do aluno, o assunto ou o conteúdo.

| E-mail | Quem recebe | Assunto |
|---|---|---|
| Novo pedido | Equipe de apoio que atende a escola do aluno | Há um novo pedido de apoio de aluno para ler |
| Ciência | Gestores da secretaria que não estão na equipe | Um aluno enviou um pedido de apoio |
| Caso recebido | Colega da equipe para quem o caso foi passado | Um pedido de apoio foi passado para você |
| Convite | Assistente social ou psicólogo cadastrado | (nome da rede): você foi cadastrado(a) na equipe de apoio ao aluno |
| Recusa | Gestor que fez o cadastro | Um profissional recusou o cadastro na equipe de apoio |

O e-mail de convite informa: quem cadastrou, para quê, os dados cadastrados (nome, função, registro, escolas atendidas), o passo a passo para aceitar e como recusar e pedir a exclusão. O link vale por 7 dias.

## 7. Documento de encaminhamento

Origem: `app/(escola)/escola/apoio/[id]/encaminhamento/page.tsx`. O profissional monta o documento e imprime ou salva em PDF. A plataforma não envia nada para fora; a entrega é feita pelo canal oficial do município. Fica registrado quem gerou, para qual órgão e se o relato do aluno foi incluído.

Conteúdo do documento:

- Cabeçalho com o nome da rede, "Secretaria de Educação", cidade e UF, e "Equipe de apoio ao aluno".
- Título "Encaminhamento à rede de proteção" e a frase "Documento sigiloso: contém dados pessoais de criança ou adolescente".
- Órgão de destino: Conselho Tutelar, polícia ou delegacia, Ministério Público, assistência social (CRAS ou CREAS) ou saúde (UBS, CAPS ou hospital).
- Frase de abertura: "Encaminhamos, para as providências cabíveis, a situação do(a) estudante identificado(a) abaixo, que procurou a equipe de apoio ao aluno desta rede de ensino."
- Identificação: nome do estudante, turma, escola e data do pedido.
- Motivo do pedido, na redação usada pela equipe.
- Síntese escrita pelo profissional.
- Providências já tomadas, se houver.
- Relato do estudante como foi escrito, só se o profissional marcar essa opção (desligada por padrão).
- Quando o destino é o Conselho Tutelar: "Esta comunicação atende ao art. 13 do Estatuto da Criança e do Adolescente (Lei 8.069/1990)."
- Pedido final: "Pedimos que o(a) estudante seja ouvido(a) uma única vez, por profissional preparado, para que não precise repetir o relato."
- Assinatura: nome, função e registro profissional.

## 8. Leis citadas nos textos

Nenhuma foi conferida na fonte oficial.

| Lei | Onde aparece | O que o texto afirma |
|---|---|---|
| Lei 8.069/1990 (ECA), art. 13 | Aviso à equipe, orientações, termo de sigilo, documento de encaminhamento | Suspeita ou confirmação de maus-tratos deve ser comunicada ao Conselho Tutelar. |
| Lei 13.431/2017 | Orientação "alguém o machuca ou causa medo" | A escuta detalhada do relato cabe a profissional preparado; o aluno não deve repetir o relato a várias pessoas. |
| Lei 13.185/2015 | Orientação "algo ruim na escola" | A escola deve agir contra a intimidação entre colegas. |
| Lei 13.709/2018 (LGPD) | Termo de sigilo | A Secretaria é a controladora e a Codevelop a operadora; o profissional pode pedir confirmação, acesso, correção e exclusão dos seus dados. |
| Lei 13.935/2019 | Não aparece nos textos | É a lei dos serviços de psicologia e serviço social na educação básica; vale avaliar se o canal deve mencioná-la. |

## 9. Regras de acesso que sustentam os textos

- Só lê os pedidos quem a Secretaria indicou por nome. O perfil sozinho não dá acesso, nem o de gestor.
- Cada pessoa da equipe atende a rede toda ou só as escolas que a Secretaria marcou, e vê apenas os pedidos dessas escolas.
- Família, professores e direção não têm acesso, e o pedido não aparece no painel dos responsáveis.
- Nenhuma inteligência artificial lê, resume ou transcreve o pedido ou a gravação.
- O que o aluno enviou não volta a aparecer no aparelho dele.
- Abertura de pedido, mudança de situação, passagem de caso, comunicação a órgão e geração de documento ficam registradas com autor, data e hora.
- Os pedidos ficam fora da tela geral de auditoria da rede, para que ela não revele quem pediu ajuda.
- O perfil "Profissional de apoio" só alcança os pedidos de apoio e a formação; as demais telas e dados da plataforma ficam fechados para ele.
- O canal é opcional por rede, e a Secretaria escolhe a partir de que ano escolar ele aparece.
