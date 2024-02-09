
const fetchKline = async (symbol) => {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=1`;
  const response = await fetch(url);
  const data = await response.json();
  const kline = data.result.list;
  const numericValues = kline.map(entry => parseFloat(entry[1]));
  const ema = EMA(numericValues, 59);
  const emaDist = ((numericValues[0] - ema[0]) / numericValues[0]) * 100;
  return { symbol, EMA_dist: emaDist };
};
var series = null;
var emaSeries  = null ;
const analyzeCoins = async () => {
  const coinsResponse = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
  const coinsData = await coinsResponse.json();
  const coins = coinsData.result.list.filter(coin => coin.status === 'Trading').map(coin => coin.symbol);

  const results = await Promise.all(coins.map(coin => fetchKline(coin)));
  const positiveDF = results.filter(({ EMA_dist }) => EMA_dist > 0).sort((a, b) => b.EMA_dist - a.EMA_dist).slice(0, 10);
  const negativeDF = results.filter(({ EMA_dist }) => EMA_dist < 0).sort((a, b) => a.EMA_dist - b.EMA_dist).slice(0, 10);

  populateTable('positiveTable', positiveDF);
  populateTable('negativeTable', negativeDF);
}; 

const populateTable = (tableId, data) => {
  const tableBody = document.getElementById(tableId).getElementsByTagName('tbody')[0];

  // Limpiar el cuerpo de la tabla antes de agregar nuevos datos
  tableBody.innerHTML = '';

  data.forEach(({ symbol, EMA_dist }) => {
      const row = tableBody.insertRow();
      const cell1 = row.insertCell(0);
      const cell2 = row.insertCell(1);
      cell1.textContent = symbol;
      cell1.onclick = () => graph(series, symbol, emaSeries);
      // round texContent to 2 decimal places and add % symbol
      cell2.textContent = `${EMA_dist.toFixed(2)}%`;
  });
};

const graph = async (series, symbol, emaSeries) => {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=1`;
  const response = await fetch(url);
  const data = await response.json();
  const kline = data.result.list;
  function convertirDatos(datos) {
      return datos.map(arr => ({
          time: parseInt(parseFloat(arr[0])/1000),
          open: parseFloat(arr[1]),
          high: parseFloat(arr[2]),
          low: parseFloat(arr[3]),
          close: parseFloat(arr[4]),
      })).reverse() ;
  }
  const datosConv1 = convertirDatos(kline)
  const numericValues = kline.map(entry => parseFloat(entry[1]));
  const ema = EMA(numericValues, 59).reverse();
  const emaData = datosConv1.slice(0, ema.length).map((entry, index) => ({
    time: entry.time,
    value: ema[index], // Aquí asignamos el valor de la EMA a la serie
  }));

  emaSeries.setData(emaData);
  console.log(ema);
  series.setData(datosConv1);
  
}

const graphSeries = async (symbol) => {
  var chart = LightweightCharts.createChart(document.getElementById('chart'), {
    width: 600,
    height: 300,
    timeScale: {
        timeVisible: true,
        borderColor: '#D1D4DC',
      },
      
    rightPriceScale: {
      borderColor: '#D1D4DC',
    },
     layout: {
      background: {
              type: 'solid',
              color: '#000',
          },
      textColor: '#FFFFFF',
    },
    grid: {
      horzLines: {
        color: '#ffffff20',
      },
      vertLines: {
        color: '#f0f3fa1a',
      },
    },
  });
  chart.applyOptions({
    priceFormat: {
    type: 'custom',
    minMove: '0.00000001',
    formatter: (price) => {
            if (price < 0.001) return parseFloat(price).toFixed(8)
            else if (price >= 0.001 && price < 1) return parseFloat(price).toFixed(6)
            else return parseFloat(price)
        }
    },                                         priceScale: {
        autoScale: true
    },
    localization: {
        locale: 'en-US',
        priceFormatter:  (price) => {
            if (price < 0.001) return parseFloat(price).toFixed(8)
            else if (price >= 0.001 && price < 1) return parseFloat(price).toFixed(6)
            else return parseFloat(price)
        }
    },
});
  series = chart.addCandlestickSeries({
      upColor: 'rgb(38,166,154)',
      downColor: 'rgb(255,82,82)',
      wickUpColor: 'rgb(38,166,154)',
      wickDownColor: 'rgb(255,82,82)',
      borderVisible: false,
    });
  emaSeries = chart.addLineSeries({
    color: 'rgba(255, 255, 255 ,1)',
    lineWidth: 2,
  });
  graph(series, symbol, emaSeries);  
}
  
analyzeCoins();
setInterval(analyzeCoins, 60000);
window.onload = (event) => {
  graphSeries('BTCUSDT');
};
