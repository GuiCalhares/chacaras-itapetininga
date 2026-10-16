# DATA_NOTES

Gerado por `prep.py` a partir de `data_raw.json` (excluido != true).

- total: 226
- banheiros conhecidos: 192 (anuncio 125, pagina 67)
- suites conhecidas: 116
- piscina: sim=126, não informado=100
- quartos conhecidos: 204
- area_terreno conhecida: 219
- area_construida conhecida: 153

Notas:
- Valores desconhecidos = null (UI mostra "não informado").
- banheiros: só contagens explícitas no texto ("N banheiro(s)"/WC); suítes não são somadas; lavabo ignorado.
- `fonte_banheiros`: anuncio = descrição já coletada; pagina = re-fetch da URL; null = desconhecido.
- dist_km é estimativa em linha reta.
- piscina "não" não é inferido: ausência de menção = "não informado".
