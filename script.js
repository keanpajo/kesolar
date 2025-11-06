// ===============================
// CONFIGURACIÓN Y ESTADO
// ===============================
const CONFIG = {
  TICK_MS: 2000,
  DAY_HOURS: 24,
  STORAGE_KEYS: {
    SOC: 'ec_soc_config_v1',
    EQUIPOS: 'ec_equipos_v2',
    EXTRA_EQUIPOS: 'equiposExtra_v2'
  },
  DEFAULT_SOC: {
    socMax: 100,
    dod: 20
  },
  DEFAULT_EQUIPOS: {
    'Equipo 1': {
      activo: true,
      credito: 30,
      consumoBase: 8,
      tipoSistema: 'residencial',
      capacidadBateria: 10,
      cliente: {
        numero: 'CLI-001',
        nombre: 'María González López',
        rut: '12.345.678-9',
        email: 'maria.gonzalez@email.com',
        telefono: '+56 9 8765 4321',
        direccion: 'Av. del Mar 1000, La Serena, Región de Coquimbo',
        lat: '-29.9075', // La Serena, Coquimbo
        lng: '-71.2575'
      }
    },
    'Equipo 2': {
      activo: false,
      credito: 15,
      consumoBase: 5,
      tipoSistema: 'comercial',
      capacidadBateria: 15,
      cliente: {
        numero: 'CLI-002',
        nombre: 'Comercial XYZ Ltda.',
        rut: '76.543.210-8',
        email: 'contacto@comercialxyz.cl',
        telefono: '+56 2 2345 6789',
        direccion: 'Av. Costanera 2000, Coquimbo, Región de Coquimbo',
        lat: '-29.9533', // Coquimbo, Coquimbo
        lng: '-71.3436'
      }
    },
    'Equipo 3': {
      activo: true,
      credito: 3,
      consumoBase: 12,
      tipoSistema: 'industrial',
      capacidadBateria: 25,
      cliente: {
        numero: 'CLI-003',
        nombre: 'Industrias ABC S.A.',
        rut: '98.765.432-1',
        email: 'operaciones@industriasabc.cl',
        telefono: '+56 2 3456 7890',
        direccion: 'Parque Industrial, Ovalle, Región de Coquimbo',
        lat: '-30.6035', // Ovalle, Coquimbo
        lng: '-71.1995'
      }
    }
  },
  ARDUINO_API_URL: 'https://disciplines-workflow-neon-groups.trycloudflare.com/api/datos',
  // Años disponibles para los gráficos
  ANOS_DISPONIBLES: [2022, 2023, 2024, 2025],
  // Meses disponibles
  MESES_DISPONIBLES: [
    { valor: 0, nombre: 'Enero' },
    { valor: 1, nombre: 'Febrero' },
    { valor: 2, nombre: 'Marzo' },
    { valor: 3, nombre: 'Abril' },
    { valor: 4, nombre: 'Mayo' },
    { valor: 5, nombre: 'Junio' },
    { valor: 6, nombre: 'Julio' },
    { valor: 7, nombre: 'Agosto' },
    { valor: 8, nombre: 'Septiembre' },
    { valor: 9, nombre: 'Octubre' },
    { valor: 10, nombre: 'Noviembre' },
    { valor: 11, nombre: 'Diciembre' }
  ]
};

// Estado global
let state = {
  equipos: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.EQUIPOS) || null) || CONFIG.DEFAULT_EQUIPOS,
  socConfig: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SOC) || null) || CONFIG.DEFAULT_SOC,
  equipoSeleccionado: null,
  simulatedHour: 6,
  simTimer: null,
  realDataTimer: null,
  dayData: {},
  charts: {},
  lastRealData: null,
  realDataAvailable: false,
  searchTerm: '',
  alertasExpandidas: false,
  floatingChart: null,
  // Año y mes seleccionados para los gráficos
  anoSeleccionadoMensual: new Date().getFullYear(),
  mesSeleccionadoMensual: new Date().getMonth(),
  anoSeleccionadoAnual: new Date().getFullYear(),
  // Datos históricos para años y meses
  datosMensuales: {}, // Estructura: { [equipo]: { [año]: { [mes]: datos } } }
  datosAnuales: {},    // Estructura: { [equipo]: { [año]: datos } }
  // Estado de conexión
  conexionAlertShown: false,
  conexionErrorCount: 0
};

// ===============================
// FUNCIONES UTILITARIAS
// ===============================
const Utils = {
  gauss: (hour, peakHour, width = 3) => {
    const a = (hour - peakHour);
    return Math.exp(-(a * a) / (2 * width * width));
  },
  randBetween: (a, b) => a + Math.random() * (b - a),
  round: (n, dec = 0) => Number(n.toFixed(dec)),
  getColorByValue: (value, low = 35, medium = 60) => value < low ? 'rojo' : value < medium ? 'amarillo' : 'verde',
  generarNumeroCliente: () => {
    const equipos = Object.values(state.equipos);
    const ultimoNumero = Math.max(...equipos.map(eq => {
      const num = eq.cliente?.numero?.replace('CLI-', '');
      return num ? parseInt(num) : 0;
    }), 0);
    return 'CLI-' + String(ultimoNumero + 1).padStart(3, '0');
  },
  mostrarBadgeRealTime: (elementId, show = true) => {
    const badge = document.getElementById(elementId);
    if (badge) {
      badge.style.display = show ? 'block' : 'none';
    }
  },
  // Función para filtrar equipos
  filtrarEquipos: (termino) => {
    const equipos = Object.entries(state.equipos);
    if (!termino.trim()) {
      return equipos; // Si no hay término, devolver todos
    }
    
    const terminoLower = termino.toLowerCase();
    return equipos.filter(([nombre, datos]) => {
      // Buscar en nombre del equipo
      if (nombre.toLowerCase().includes(terminoLower)) return true;
      
      // Buscar en tipo de sistema
      if (datos.tipoSistema && datos.tipoSistema.toLowerCase().includes(terminoLower)) return true;
      
      // Buscar en información del cliente
      if (datos.cliente) {
        if (datos.cliente.nombre && datos.cliente.nombre.toLowerCase().includes(terminoLower)) return true;
        if (datos.cliente.rut && datos.cliente.rut.toLowerCase().includes(terminoLower)) return true;
        if (datos.cliente.direccion && datos.cliente.direccion.toLowerCase().includes(terminoLower)) return true;
        if (datos.cliente.numero && datos.cliente.numero.toLowerCase().includes(terminoLower)) return true;
      }
      
      return false;
    });
  },
  // Función para determinar el estado de alerta de un equipo
  determinarEstadoAlerta: (equipo, datosEquipo) => {
    if (!datosEquipo.activo) return { estado: 'INACTIVO', nivel: 'inactivo', detalles: ['Equipo desactivado'] };
    
    // Si no hay datos del día para este equipo, generar datos
    if (!state.dayData[equipo]) {
      state.dayData[equipo] = DataManager.generarDiaRealista(equipo);
    }
    
    const d = state.dayData[equipo];
    const h = state.simulatedHour;
    
    let alertas = [];
    let nivel = 'normal';
    
    // Verificar celdas
    for (let c = 0; c < 16; c++) {
      const v = d.voltCells[c][h];
      if (v < 3.0 || v > 3.65) {
        alertas.push(`Celda ${c+1} fuera de rango (${v}V)`);
        nivel = 'critico';
      } else if (v < 3.1 || v > 3.6) {
        alertas.push(`Celda ${c+1} en límite (${v}V)`);
        if (nivel !== 'critico') nivel = 'advertencia';
      }
    }
    
    // Verificar temperatura
    const temp = d.tempInv[h];
    if (temp > 55) {
      alertas.push(`Temperatura crítica (${temp}°C)`);
      nivel = 'critico';
    } else if (temp > 45) {
      alertas.push(`Temperatura alta (${temp}°C)`);
      if (nivel !== 'critico') nivel = 'advertencia';
    }
    
    // Verificar SOC
    const soc = d.bateriaPct[h];
    if (soc < state.socConfig.dod + 2) {
      alertas.push(`SOC crítico (${soc}%)`);
      nivel = 'critico';
    } else if (soc < state.socConfig.dod + 8) {
      alertas.push(`SOC bajo (${soc}%)`);
      if (nivel !== 'critico') nivel = 'advertencia';
    }
    
    // Verificar producción solar
    const solarDuringDay = d.solar.slice(10, 17).some(v => v > 10);
    if (!solarDuringDay && h >= 10 && h <= 17) {
      alertas.push('Sin producción solar durante el día');
      if (nivel !== 'critico') nivel = 'advertencia';
    }
    
    // Si no hay alertas específicas, verificar estado general
    if (alertas.length === 0) {
      alertas.push('Sistema operando normalmente');
    }
    
    return {
      estado: nivel === 'critico' ? 'CRÍTICO' : 
             nivel === 'advertencia' ? 'ADVERTENCIA' : 'NORMAL',
      nivel: nivel,
      detalles: alertas
    };
  },
  // Generar datos mensuales más realistas con variación estacional
  generarDatosMensuales(equipo, año, mes) {
    const base = state.equipos[equipo].consumoBase;
    
    // Factores estacionales (para hemisferio sur)
    const factoresEstacionales = [
      0.9,  // Enero - verano, alta producción
      0.85, // Febrero - verano
      0.8,  // Marzo - fin verano
      0.7,  // Abril - otoño
      0.6,  // Mayo - otoño/invierno
      0.55, // Junio - invierno
      0.6,  // Julio - invierno
      0.65, // Agosto - fin invierno
      0.75, // Septiembre - primavera
      0.85, // Octubre - primavera
      0.9,  // Noviembre - primavera/verano
      0.95  // Diciembre - verano
    ];
    
    const factorEstacional = factoresEstacionales[mes];
    const factorAnual = 1 + (año - 2023) * 0.02; // Pequeña mejora anual
    
    // Generar 30 días de datos
    return Array.from({ length: 30 }, (_, i) => {
      // Variación diaria con patrón semanal (menos producción los fines de semana)
      const diaSemana = (i % 7);
      const factorDia = (diaSemana === 0 || diaSemana === 6) ? 0.7 : 1;
      
      // Variación aleatoria controlada
      const variacionAleatoria = 0.8 + Math.random() * 0.4;
      
      return Math.round(base * 1000 * factorEstacional * factorAnual * factorDia * variacionAleatoria);
    });
  },
  
  // Generar datos anuales con variación estacional
  generarDatosAnuales(equipo, año) {
    const base = state.equipos[equipo].consumoBase;
    const factorAnual = 1 + (año - 2023) * 0.02; // Pequeña mejora anual
    
    // Factores estacionales (promedio mensual)
    const factoresEstacionales = [0.9, 0.85, 0.8, 0.7, 0.6, 0.55, 0.6, 0.65, 0.75, 0.85, 0.9, 0.95];
    
    return factoresEstacionales.map((factorEstacional, mes) => {
      // Pequeña variación aleatoria por mes
      const variacionAleatoria = 0.9 + Math.random() * 0.2;
      return Math.round(base * 1000 * factorEstacional * factorAnual * variacionAleatoria * 30); // 30 días por mes
    });
  },
  
  // Inicializar selectores de año y mes
  inicializarSelectoresGraficos() {
    const selectAnoMensual = document.getElementById('selectAnoMensual');
    const selectMesMensual = document.getElementById('selectMesMensual');
    const selectAnoAnual = document.getElementById('selectAnoAnual');
    
    // Limpiar selectores
    selectAnoMensual.innerHTML = '';
    selectMesMensual.innerHTML = '';
    selectAnoAnual.innerHTML = '';
    
    // Llenar selectores de año
    CONFIG.ANOS_DISPONIBLES.forEach(ano => {
      const optionMensual = document.createElement('option');
      optionMensual.value = ano;
      optionMensual.textContent = ano;
      optionMensual.selected = (ano === state.anoSeleccionadoMensual);
      selectAnoMensual.appendChild(optionMensual);
      
      const optionAnual = document.createElement('option');
      optionAnual.value = ano;
      optionAnual.textContent = ano;
      optionAnual.selected = (ano === state.anoSeleccionadoAnual);
      selectAnoAnual.appendChild(optionAnual);
    });
    
    // Llenar selector de mes
    CONFIG.MESES_DISPONIBLES.forEach(mes => {
      const option = document.createElement('option');
      option.value = mes.valor;
      option.textContent = mes.nombre;
      option.selected = (mes.valor === state.mesSeleccionadoMensual);
      selectMesMensual.appendChild(option);
    });
    
    // Agregar event listeners
    selectAnoMensual.addEventListener('change', (e) => {
      state.anoSeleccionadoMensual = parseInt(e.target.value);
      ChartManager.actualizarGraficoMensual();
    });
    
    selectMesMensual.addEventListener('change', (e) => {
      state.mesSeleccionadoMensual = parseInt(e.target.value);
      ChartManager.actualizarGraficoMensual();
    });
    
    selectAnoAnual.addEventListener('change', (e) => {
      state.anoSeleccionadoAnual = parseInt(e.target.value);
      ChartManager.actualizarGraficoAnual();
    });
  },
  
  // Funciones para manejar alertas de conexión
  mostrarAlertaConexion(tipo = 'error', mensaje = null) {
    const alerta = document.getElementById('conexionAlert');
    const titulo = document.getElementById('conexionAlertTitle');
    const mensajeEl = document.getElementById('conexionAlertMessage');
    
    if (!alerta) return;
    
    // Configurar según el tipo
    alerta.className = '';
    if (tipo === 'error') {
      alerta.classList.add('error');
      titulo.textContent = 'Problema de conexión';
      mensajeEl.textContent = mensaje || 'No se pueden obtener datos del servidor Arduino';
    } else if (tipo === 'warning') {
      alerta.classList.add('warning');
      titulo.textContent = 'Advertencia de conexión';
      mensajeEl.textContent = mensaje || 'Conexión inestable con el servidor';
    } else if (tipo === 'success') {
      alerta.classList.add('success');
      titulo.textContent = 'Conexión restaurada';
      mensajeEl.textContent = mensaje || 'Se han recuperado los datos del servidor';
    }
    
    // Mostrar alerta
    alerta.classList.add('show');
    state.conexionAlertShown = true;
    
    // Auto-ocultar después de 5 segundos para mensajes de éxito
    if (tipo === 'success') {
      setTimeout(() => {
        this.ocultarAlertaConexion();
      }, 5000);
    }
  },
  
  ocultarAlertaConexion() {
    const alerta = document.getElementById('conexionAlert');
    if (alerta) {
      alerta.classList.remove('show');
      state.conexionAlertShown = false;
    }
  }
};

// ===============================
// GESTIÓN DE DATOS REALES ARDUINO (SOLO EQUIPO 1)
// ===============================
const RealDataManager = {
  async obtenerDatosReales() {
    // Solo obtener datos reales para Equipo 1
    if (state.equipoSeleccionado !== "Equipo 1") {
      this.ocultarTodosLosBadges();
      state.realDataAvailable = false;
      Utils.ocultarAlertaConexion();
      return null;
    }
    try {
      const response = await fetch(CONFIG.ARDUINO_API_URL);
      if (!response.ok) throw new Error('Error en la respuesta');
      const data = await response.json();
      state.lastRealData = data;
      state.realDataAvailable = true;
      
      // Reiniciar contador de errores y mostrar éxito si había error antes
      if (state.conexionErrorCount > 0) {
        state.conexionErrorCount = 0;
        Utils.mostrarAlertaConexion('success', 'Conexión con Arduino restaurada correctamente');
      }
      
      this.actualizarUIconDatosReales(data);
      return data;
    } catch (error) {
      console.warn("⚠️ Error obteniendo datos reales del Arduino:", error);
      state.realDataAvailable = false;
      this.ocultarTodosLosBadges();
      
      // Incrementar contador de errores
      state.conexionErrorCount++;
      
      // Mostrar alerta después de 3 intentos fallidos
      if (state.conexionErrorCount >= 3 && !state.conexionAlertShown) {
        let mensaje = 'No se pueden obtener datos del servidor Arduino. ';
        if (error.message.includes('Failed to fetch')) {
          mensaje += 'Verifique que el servidor esté ejecutándose y accesible en la red.';
        } else {
          mensaje += 'Error: ' + error.message;
        }
        Utils.mostrarAlertaConexion('error', mensaje);
      }
      
      return null;
    }
  },
  actualizarUIconDatosReales(data) {
    // Solo actualizar si estamos en Equipo 1
    if (state.equipoSeleccionado !== "Equipo 1") return;

    // Mapeo de datos del Arduino a elementos UI
    const mapeo = {
      'voltajeBat': { valor: data.Vbat, formato: ' V', decimales: 2, badge: 'voltBatBadge' },
      'bateriaPct': { valor: data.SOC, formato: ' %', decimales: 1, clase: Utils.getColorByValue(data.SOC), badge: 'bateriaBadge' },
      'produccionSolar': { valor: data.Ppv, formato: ' W', decimales: 2, badge: 'solarBadge' },
      'voltPanels': { valor: data.Vpv, formato: ' V', decimales: 2, badge: 'voltPanelsBadge' },
      'potencia': { valor: data.Pconsumo || data.Ibat, formato: ' W', decimales: 2, badge: 'potenciaBadge' }
    };

    // Actualizar elementos con datos reales
    Object.entries(mapeo).forEach(([elementId, config]) => {
      const elemento = document.getElementById(elementId);
      if (elemento && config.valor !== undefined) {
        elemento.textContent = config.valor.toFixed(config.decimales) + config.formato;
        if (config.clase) {
          elemento.className = 'valor ' + config.clase;
        }
        // Mostrar badge indicador de datos en tiempo real
        if (config.badge) {
          Utils.mostrarBadgeRealTime(config.badge, true);
        }
      }
    });

    // Estado del inversor (si está disponible en los datos)
    if (data.Estado) {
      document.getElementById('estadoInv').textContent = data.Estado;
    }

    // Actualizar alarmas con datos reales
    AlertManager.chequearAlarmas();
  },
  ocultarTodosLosBadges() {
    const badges = ['voltBatBadge', 'bateriaBadge', 'solarBadge', 'voltPanelsBadge', 'potenciaBadge'];
    badges.forEach(badgeId => Utils.mostrarBadgeRealTime(badgeId, false));
  },
  iniciarMonitoreo() {
    this.detenerMonitoreo();
    // Solo monitorear si es Equipo 1
    if (state.equipoSeleccionado === "Equipo 1") {
      // Reiniciar contador de errores
      state.conexionErrorCount = 0;
      
      // Obtener datos inmediatamente
      this.obtenerDatosReales();
      // Programar actualizaciones periódicas
      state.realDataTimer = setInterval(() => {
        this.obtenerDatosReales();
      }, 3000); // Actualizar cada 3 segundos
    } else {
      this.ocultarTodosLosBadges();
      Utils.ocultarAlertaConexion();
    }
  },
  detenerMonitoreo() {
    if (state.realDataTimer) {
      clearInterval(state.realDataTimer);
      state.realDataTimer = null;
    }
    this.ocultarTodosLosBadges();
    Utils.ocultarAlertaConexion();
  },
  // Generar datos simulados complementarios basados en datos reales
  generarDatosComplementarios(dataReal) {
    const baseConsumo = state.equipos[state.equipoSeleccionado]?.consumoBase || 8;
    return {
      autoconsumo: Math.round(dataReal.Ppv * (0.6 + Math.random() * 0.3)),
      energiaRed: {
        importada: dataReal.Ppv < baseConsumo * 500 ? Math.round((baseConsumo * 500 - dataReal.Ppv) * 0.8) : 0,
        inyectada: dataReal.Ppv > baseConsumo * 500 ? Math.round((dataReal.Ppv - baseConsumo * 500) * 0.6) : 0
      },
      temperaturaInv: Utils.round(25 + dataReal.Ppv / 500 + Utils.randBetween(-1, 3), 1)
    };
  }
};

// ===============================
// GESTIÓN DE DATOS SIMULADOS
// ===============================
const DataManager = {
  generarDiaRealista(equipo) {
    const base = state.equipos[equipo].consumoBase;
    const consumo24 = [], solar24 = [], voltPanels24 = [], tempInv24 = [];
    const voltCells24 = Array.from({ length: 16 }, () => []);
    const seasonal = 1 + (Math.sin(Math.random() * Math.PI * 2) * 0.12);
    
    for (let h = 0; h < 24; h++) {
      const morningPeak = Math.exp(-Math.pow((h - 8), 2) / 18);
      const eveningPeak = Math.exp(-Math.pow((h - 20), 2) / 8);
      const consumo = Math.max(Math.round(base * 1000 * (0.6 + morningPeak * 0.9 + eveningPeak * 1.1 + Math.random() * 0.25) * seasonal), 50);
      consumo24.push(consumo);
      
      const solarMax = Math.round(base * 1000 * (0.9 + Math.random() * 0.6) * seasonal);
      const solarVal = Math.round(solarMax * Utils.gauss(h, 13, 3) * (0.6 + Math.random() * 0.8));
      solar24.push(solarVal);
      
      voltPanels24.push(Utils.round(30 + (solarMax > 0 ? (solarVal / solarMax) * 20 : 0) + Utils.randBetween(-1.2, 1.2), 2));
      tempInv24.push(Utils.round(25 + solarVal / 300 + Utils.randBetween(-1, 2), 1));
      
      for (let c = 0; c < 16; c++) {
        const cellNominal = 3.33 + Math.sin((h + c) / 12) * 0.06 + Utils.randBetween(-0.01, 0.015);
        voltCells24[c].push(Utils.round(cellNominal, 3));
      }
    }
    
    const autoconsumo = [], importGrid = [], injectGrid = [];
    for (let h = 0; h < 24; h++) {
      const consum = consumo24[h];
      const solarVal = solar24[h];
      const usedDirect = Math.round(Math.min(consum, Math.round(solarVal * (0.55 + Math.random() * 0.3))));
      autoconsumo.push(usedDirect);
      
      const balance = solarVal - consum;
      if (balance >= 0) {
        importGrid.push(0);
        injectGrid.push(Math.round(balance * (0.6 + Math.random() * 0.3)));
      } else {
        importGrid.push(Math.round(-balance * (0.8 + Math.random() * 0.2)));
        injectGrid.push(0);
      }
    }
    
    const bateriaPct = [];
    let soc = Math.max(Math.min(state.socConfig.socMax - 5 + Math.random() * 8, state.socConfig.socMax), state.socConfig.dod + 2);
    for (let h = 0; h < 24; h++) {
      const net = solar24[h] - consumo24[h];
      soc += net / 5000;
      soc += Utils.randBetween(-0.3, 0.3);
      if (soc > state.socConfig.socMax) soc = state.socConfig.socMax;
      if (soc < state.socConfig.dod) soc = state.socConfig.dod;
      bateriaPct.push(Utils.round(soc, 1));
    }
    
    const voltBatPack = [];
    for (let h = 0; h < 24; h++) {
      let s = 0;
      for (let c = 0; c < 16; c++) s += voltCells24[c][h];
      voltBatPack.push(Utils.round(s, 2));
    }
    
    return {
      potencia: consumo24,
      solar: solar24,
      voltPanels: voltPanels24,
      tempInv: tempInv24,
      voltCells: voltCells24,
      autoconsumo: autoconsumo,
      energiaImport: importGrid,
      energiaInject: injectGrid,
      bateriaPct: bateriaPct,
      voltBatPack: voltBatPack
    };
  },
  persistirDatos() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.EQUIPOS, JSON.stringify(state.equipos));
    localStorage.setItem(CONFIG.STORAGE_KEYS.SOC, JSON.stringify(state.socConfig));
  },
  cargarEquiposExtra() {
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.EXTRA_EQUIPOS) || '[]');
  },
  guardarEquipoExtra(equipoData) {
    const guardados = this.cargarEquiposExtra();
    guardados.push(equipoData);
    localStorage.setItem(CONFIG.STORAGE_KEYS.EXTRA_EQUIPOS, JSON.stringify(guardados));
  }
};

// ===============================
// INTERFAZ DE USUARIO
// ===============================
const UIManager = {
  mostrarSelector() {
    const selectorEl = document.getElementById('selector');
    const noResultsEl = document.getElementById('noResults');
    
    // Filtrar equipos según el término de búsqueda
    const equiposFiltrados = Utils.filtrarEquipos(state.searchTerm);
    
    let html = '';
    
    if (equiposFiltrados.length === 0) {
      // Mostrar mensaje de sin resultados
      noResultsEl.style.display = 'block';
      selectorEl.innerHTML = '';
    } else {
      // Ocultar mensaje de sin resultados
      noResultsEl.style.display = 'none';
      
      // Generar HTML para los equipos filtrados
      for (const [nombre, datos] of equiposFiltrados) {
        const estado = datos.activo ? '<span class="badge badge-active">ACTIVO</span>' : '<span class="badge badge-inactive">INACTIVO</span>';
        html += `
          <div class="tarjeta-equipo" onclick="abrirDashboard('${nombre.replace("'", "\\'")}')">
            <h3>${nombre}</h3>
            <div class="small">${estado} • Créditos: ${datos.credito} días</div>
            <div class="small">Tipo: ${datos.tipoSistema || 'Residencial'} • ${datos.capacidadBateria || '10'} kWh</div>
            <div class="cliente-info">
              <strong>${datos.cliente.nombre}</strong><br>
              ${datos.cliente.rut}<br>
              ${datos.cliente.direccion}
            </div>
          </div>
        `;
      }
      selectorEl.innerHTML = html;
    }
  },
  mostrarFormularioAgregar() {
    document.getElementById('modalFormTitle').textContent = 'Agregar Nuevo Equipo y Cliente';
    document.getElementById('equipoForm').reset();
    document.getElementById('numeroCliente').value = Utils.generarNumeroCliente();
    document.getElementById('formModal').style.display = 'flex';
    // Ocultar mini-mapa si existe
    if (window._miniMapInstance) {
      window._miniMapInstance.remove();
      window._miniMapInstance = null;
    }
    const miniMapDiv = document.getElementById('miniMap');
    if (miniMapDiv) {
      miniMapDiv.style.display = 'none';
    }
  },
  ocultarFormularioAgregar() {
    document.getElementById('formModal').style.display = 'none';
    document.getElementById('nombreEquipo').readOnly = false;
    // Si existe un mini-mapa previo, eliminar instancia (el contenedor puede re-renderizarse luego)
    if (window._miniMapInstance) {
      window._miniMapInstance.remove();
      window._miniMapInstance = null;
    }
    // Re-renderizar la información del cliente y mini-mapa si hay equipo seleccionado con coordenadas
    if (state.equipoSeleccionado && state.equipos[state.equipoSeleccionado]) {
      const cliente = state.equipos[state.equipoSeleccionado].cliente;
      if (cliente && cliente.lat && cliente.lng && cliente.lat !== '' && cliente.lng !== '') {
        UIManager.mostrarInformacionCliente(state.equipoSeleccionado);
      }
    }
  },
  mostrarInformacionCliente(equipo) {
    const datosEquipo = state.equipos[equipo];
    const cliente = datosEquipo.cliente;
    // Asegurarse de que lat y lng no sean cadenas vacías ni null/undefined
    const tieneUbicacion = cliente.lat && cliente.lng && cliente.lat !== '' && cliente.lng !== '';
    const clienteDetalle = document.getElementById('clienteDetalle');
    clienteDetalle.innerHTML = `
      <div class="cliente-detalle-flex">
        <div class="cliente-info-main">
          <div style="margin-bottom:10px; text-align:left;">
            <button class="view-map-btn" onclick="UIManager.mostrarFormularioEditarCliente('${equipo.replace(/'/g, "\\'")}')">
              Editar cliente
            </button>
          </div>
          <h4 style="color:var(--accent); margin-bottom:8px;">👤 Información del Cliente</h4>
          <p><strong>Nombre:</strong> ${cliente.nombre}</p>
          <p><strong>RUT:</strong> ${cliente.rut}</p>
          <p><strong>N° Cliente:</strong> ${cliente.numero}</p>
          <p><strong>Email:</strong> ${cliente.email || 'No especificado'}</p>
          <p><strong>Teléfono:</strong> ${cliente.telefono || 'No especificado'}</p>
          <p><strong>Dirección:</strong> ${cliente.direccion}</p>
        </div>
        <div class="cliente-info-map">
          ${
            tieneUbicacion
            ? `<div class="client-location">
                  <div class="client-map-header">
                    <strong>📍 Ubicación del Cliente</strong>
                    <button class="view-map-btn" onclick="mostrarMapaUbicacion(${JSON.stringify(cliente).replace(/"/g, '&quot;')})">
                      Ver mapa completo
                    </button>
                  </div>
                  <div class="location-coordinates">
                    <strong>Dirección:</strong> ${cliente.direccion || 'No especificada'}<br>
                    <strong>Coordenadas:</strong> ${cliente.lat}, ${cliente.lng}
                  </div>
                  <div id="miniMap" class="mini-map-container"></div>
                </div>`
            : `<div class="no-location-message">
                  <strong>📍 Ubicación:</strong> No hay datos de ubicación registrados para este cliente.
                  <div class="small" style="margin-top: 5px;">
                    Puedes agregar coordenadas editando la información del cliente.
                  </div>
                </div>`
          }
        </div>
      </div>
    `;
    clienteDetalle.style.display = 'block';

    // Inicializar mini-mapa si hay coordenadas válidas
    if (tieneUbicacion && window.L && document.getElementById('miniMap')) {
      setTimeout(() => {
        if (document.getElementById('miniMap')) {
          if (window._miniMapInstance) {
            window._miniMapInstance.remove();
          }
          window._miniMapInstance = L.map('miniMap').setView([parseFloat(cliente.lat), parseFloat(cliente.lng)], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(window._miniMapInstance);
          L.marker([parseFloat(cliente.lat), parseFloat(cliente.lng)]).addTo(window._miniMapInstance)
            .bindPopup(cliente.nombre || 'Ubicación del cliente');
        }
      }, 300);
    }
  },
  // --- NUEVO: Formulario para editar cliente ---
  mostrarFormularioEditarCliente(equipo) {
    const datosEquipo = state.equipos[equipo];
    const cliente = datosEquipo.cliente;
    // Mostrar el modal de formulario y rellenar los campos con los datos actuales
    document.getElementById('modalFormTitle').textContent = 'Editar Cliente';
    document.getElementById('formModal').style.display = 'flex';
    document.getElementById('nombreEquipo').value = equipo;
    document.getElementById('nombreEquipo').readOnly = true;
    document.getElementById('consumoBase').value = datosEquipo.consumoBase;
    document.getElementById('tipoSistema').value = datosEquipo.tipoSistema;
    document.getElementById('capacidadBateria').value = datosEquipo.capacidadBateria;
    document.getElementById('numeroCliente').value = cliente.numero;
    document.getElementById('nombreCliente').value = cliente.nombre;
    document.getElementById('rutCliente').value = cliente.rut;
    document.getElementById('emailCliente').value = cliente.email;
    document.getElementById('telefonoCliente').value = cliente.telefono;
    document.getElementById('direccionCliente').value = cliente.direccion;
    document.getElementById('latCliente').value = cliente.lat || '';
    document.getElementById('lngCliente').value = cliente.lng || '';
    document.getElementById('creditoInicial').value = datosEquipo.credito;
    document.getElementById('estadoInicial').value = datosEquipo.activo ? 'activo' : 'inactivo';
    // Ocultar mini-mapa si existe
    if (window._miniMapInstance) {
      window._miniMapInstance.remove();
      window._miniMapInstance = null;
    }
    const miniMapDiv = document.getElementById('miniMap');
    if (miniMapDiv) {
      miniMapDiv.style.display = 'none';
    }
    // Cambiar el comportamiento del submit temporalmente
    const form = document.getElementById('equipoForm');
    form.onsubmit = function(e) {
      e.preventDefault();
      // Actualizar los datos del cliente y equipo
      datosEquipo.consumoBase = parseFloat(document.getElementById('consumoBase').value);
      datosEquipo.tipoSistema = document.getElementById('tipoSistema').value;
      datosEquipo.capacidadBateria = parseFloat(document.getElementById('capacidadBateria').value);
      datosEquipo.credito = parseInt(document.getElementById('creditoInicial').value);
      datosEquipo.activo = document.getElementById('estadoInicial').value === 'activo';
      datosEquipo.cliente.numero = document.getElementById('numeroCliente').value;
      datosEquipo.cliente.nombre = document.getElementById('nombreCliente').value;
      datosEquipo.cliente.rut = document.getElementById('rutCliente').value;
      datosEquipo.cliente.email = document.getElementById('emailCliente').value;
      datosEquipo.cliente.telefono = document.getElementById('telefonoCliente').value;
      datosEquipo.cliente.direccion = document.getElementById('direccionCliente').value;
      datosEquipo.cliente.lat = document.getElementById('latCliente').value;
      datosEquipo.cliente.lng = document.getElementById('lngCliente').value;
      DataManager.persistirDatos();
      UIManager.ocultarFormularioAgregar();
      UIManager.mostrarInformacionCliente(equipo);
      UIManager.actualizarInfoSuscripcion();
      UIManager.mostrarSelector();
      UIManager.actualizarAlertasPanel();
      // Restaurar el submit original
      form.onsubmit = (ev) => EquipoManager.procesarFormulario(ev);
    };
  },
  actualizarResumen() {
    if (!state.equipoSeleccionado) return;
    const d = state.dayData[state.equipoSeleccionado];
    const consumed_kwh = d.potencia.reduce((a, b) => a + b, 0) / 1000;
    const solar_kwh = d.solar.reduce((a, b) => a + b, 0) / 1000;
    const imported_kwh = d.energiaImport.reduce((a, b) => a + b, 0) / 1000;
    const injected_kwh = d.energiaInject.reduce((a, b) => a + b, 0) / 1000;
    const autocons_kwh = d.autoconsumo.reduce((a, b) => a + b, 0) / 1000;
    const autocons_pct = solar_kwh > 0 ? Utils.round((autocons_kwh / solar_kwh) * 100, 1) : 0;
    const status = AlertManager.determinarEstadoGeneral();
    
    document.getElementById('sumConsumed').textContent = Utils.round(consumed_kwh, 2) + ' kWh';
    document.getElementById('sumSolar').textContent = Utils.round(solar_kwh, 2) + ' kWh';
    document.getElementById('sumGrid').textContent = Utils.round(imported_kwh, 2) + ' / ' + Utils.round(injected_kwh, 2) + ' kWh';
    document.getElementById('sumAuto').textContent = autocons_pct + ' %';
    
    const statusDot = document.getElementById('summaryStatusDot');
    statusDot.style.background = status === 'CRÍTICO' ? 'var(--alert-red)' : status === 'ADVERTENCIA' ? 'var(--alert-amber)' : 'var(--alert-green)';
  },
  // Nueva función para manejar la búsqueda
  manejarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    state.searchTerm = searchInput.value;
    this.mostrarSelector();
  },
  // Nueva función para limpiar la búsqueda
  limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    state.searchTerm = '';
    this.mostrarSelector();
  },
  // Nueva función para actualizar el panel de alertas
  actualizarAlertasPanel() {
    const alertasContainer = document.getElementById('alertasContainer');
    const alertasBadge = document.getElementById('alertasBadge');
    let html = '';
    let countAlertas = 0;
    
    for (const [nombre, datos] of Object.entries(state.equipos)) {
      const alerta = Utils.determinarEstadoAlerta(nombre, datos);
      // Solo mostrar equipos con alertas (no normales)
      if (alerta.nivel !== 'normal') {
        countAlertas++;
        const claseAlerta = `alerta-equipo ${alerta.nivel}`;
        
        html += `
          <div class="${claseAlerta}" onclick="abrirDashboard('${nombre}')">
            <div class="alerta-header">
              <div class="alerta-nombre">${nombre}</div>
              <div class="alerta-estado">
                <span class="dot ${alerta.nivel === 'critico' ? 'red' : 'amber'}"></span>
                <span>${alerta.estado}</span>
              </div>
            </div>
            <div class="alerta-detalles">
              ${alerta.detalles.map(detalle => `<p>• ${detalle}</p>`).join('')}
            </div>
          </div>
        `;
      }
    }
    
    // Actualizar el badge con el número de alertas
    alertasBadge.textContent = countAlertas;
    
    // Si no hay alertas, mostrar un mensaje
    if (countAlertas === 0) {
      html = '<p style="grid-column: 1 / -1; text-align: center; color: #9eddd6;">No hay alertas en este momento.</p>';
    }
    
    alertasContainer.innerHTML = html;
  },
  // Función para alternar la expansión del panel de alertas
  toggleAlertasPanel() {
    const alertasBody = document.getElementById('alertasBody');
    const alertasToggle = document.getElementById('alertasToggle');
    
    state.alertasExpandidas = !state.alertasExpandidas;
    
    if (state.alertasExpandidas) {
      alertasBody.classList.add('expanded');
      alertasToggle.textContent = '▲';
    } else {
      alertasBody.classList.remove('expanded');
      alertasToggle.textContent = '▼';
    }
  },
  // Función para mostrar gráfico flotante
  mostrarGraficoFlotante(tipo, titulo) {
    if (!state.equipoSeleccionado || !state.dayData[state.equipoSeleccionado]) return;
    
    const datos = state.dayData[state.equipoSeleccionado];
    const ctx = document.getElementById('floatingChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (state.floatingChart) {
      state.floatingChart.destroy();
    }
    
    // Configurar datos según el tipo
    let datasets = [];
    let labels = Array.from({ length: 24 }, (_, i) => i + 'h');
    
    switch(tipo) {
      case 'potencia':
        datasets = [{
          label: 'Consumo (W)',
          data: datos.potencia,
          borderColor: '#5bc0be',
          backgroundColor: 'rgba(91,192,190,0.12)',
          fill: true,
          tension: 0.3
        }];
        break;
      case 'solar':
        datasets = [{
          label: 'Producción Solar (W)',
          data: datos.solar,
          borderColor: '#ffd66b',
          backgroundColor: 'rgba(255,214,107,0.08)',
          fill: true,
          tension: 0.3
        }];
        break;
      case 'voltPanels':
        datasets = [{
          label: 'Voltaje Paneles (V)',
          data: datos.voltPanels,
          borderColor: '#6ef08a',
          backgroundColor: 'rgba(110,240,138,0.08)',
          fill: true,
          tension: 0.3
        }];
        break;
      case 'energiaRed':
        datasets = [
          {
            label: 'Energía Importada (W)',
            data: datos.energiaImport,
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255,107,107,0.08)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Energía Inyectada (W)',
            data: datos.energiaInject,
            borderColor: '#6ef08a',
            backgroundColor: 'rgba(110,240,138,0.08)',
            fill: true,
            tension: 0.3
          }
        ];
        break;
      case 'autoconsumo':
        datasets = [{
          label: 'Autoconsumo (W)',
          data: datos.autoconsumo,
          borderColor: '#9d4edd',
          backgroundColor: 'rgba(157,78,221,0.08)',
          fill: true,
          tension: 0.3
        }];
        break;
      case 'voltBatPack':
        datasets = [{
          label: 'Voltaje Batería (V)',
          data: datos.voltBatPack,
          borderColor: '#f48c06',
          backgroundColor: 'rgba(244,140,6,0.08)',
          fill: true,
          tension: 0.3
        }];
        break;
      case 'bateriaPct':
        datasets = [{
          label: 'Porcentaje Batería (%)',
          data: datos.bateriaPct,
          borderColor: '#4361ee',
          backgroundColor: 'rgba(67,97,238,0.08)',
          fill: true,
          tension: 0.3
        }];
        break;
      case 'tempInv':
        datasets = [{
          label: 'Temperatura Inversor (°C)',
          data: datos.tempInv,
          borderColor: '#ef233c',
          backgroundColor: 'rgba(239,35,60,0.08)',
          fill: true,
          tension: 0.3
        }];
        break;
    }
    
    // Crear nuevo gráfico
    // Estilos modernos para gráfico flotante
    state.floatingChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets.map(ds => ({
          ...ds,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 4,
          fill: ds.fill ?? true
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9eddd6' } },
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9eddd6' } }
        }
      }
    });
    
    // Configurar título y mostrar modal
    document.getElementById('floatingChartTitle').textContent = titulo;
    document.getElementById('floatingChartModal').style.display = 'flex';
  },
  
  // Función para alternar configuración de batería
  toggleConfiguracionBateria() {
    const batteryConfig = document.getElementById('batteryConfig');
    const isShowing = batteryConfig.classList.contains('show');
    
    if (!isShowing) {
      // Si se va a mostrar, cargar valores actuales
      document.getElementById('socMaxInputCard').value = state.socConfig.socMax;
      document.getElementById('dodInputCard').value = state.socConfig.dod;
    }
    
    batteryConfig.classList.toggle('show');
  },
  
  // Función para guardar configuración SOC
  guardarConfiguracionSOC() {
    const v1 = Number(document.getElementById('socMaxInputCard').value);
    const v2 = Number(document.getElementById('dodInputCard').value);
    
    if (isNaN(v1) || isNaN(v2) || v1 < 50 || v1 > 100 || v2 < 5 || v2 >= v1) {
      alert('Valores inválidos. SOC máx entre 50-100, DOD entre 5 y SOC máx-1.');
      return;
    }
    
    state.socConfig.socMax = Math.round(v1);
    state.socConfig.dod = Math.round(v2);
    localStorage.setItem(CONFIG.STORAGE_KEYS.SOC, JSON.stringify(state.socConfig));
    
    if (state.equipoSeleccionado) {
      state.dayData[state.equipoSeleccionado] = DataManager.generarDiaRealista(state.equipoSeleccionado);
      ChartManager.generarGraficosGenerales();
      SimulationManager.actualizarLecturas();
    }
    
    alert('Configuración SOC guardada.');
    UIManager.actualizarAlertasPanel();
    
    // Ocultar configuración después de guardar
    document.getElementById('batteryConfig').classList.remove('show');
  },
  
  // Función para mostrar configuración de suscripción
  mostrarConfiguracionSuscripcion() {
    if (!state.equipoSeleccionado) return;

    const equipo = state.equipos[state.equipoSeleccionado];
    document.getElementById('creditoActual').textContent = equipo.credito;

    const estadoSuscripcion = document.getElementById('estadoSuscripcion');
    if (equipo.activo) {
      estadoSuscripcion.textContent = 'ACTIVO';
      estadoSuscripcion.className = 'badge badge-active';
    } else {
      estadoSuscripcion.textContent = 'INACTIVO';
      estadoSuscripcion.className = 'badge badge-inactive';
    }

    document.getElementById('suscripcionModal').style.display = 'flex';
  },
  
  // Función para actualizar la información de suscripción en el dashboard
  actualizarInfoSuscripcion() {
    if (!state.equipoSeleccionado) return;
    
    const equipo = state.equipos[state.equipoSeleccionado];
    document.getElementById('estadoLinea').innerHTML = `Estado: ${equipo.activo ? '<span style="color:var(--alert-green)">OPERATIVO</span>' : '<span style="color:var(--alert-red)">INACTIVO</span>'} • Consumo base: ${equipo.consumoBase} kW • Créditos: <b id="credVal">${equipo.credito}</b> días`;
  }
};

// ===============================
// GESTIÓN DE GRÁFICOS
// ===============================
const ChartManager = {
  generarGraficosGenerales() {
    if (!state.equipoSeleccionado) return;
    const datos = state.dayData[state.equipoSeleccionado];
    
    // Destruir gráficos existentes
    Object.values(state.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    state.charts = {};
    
    // Gráfico diario (sin cambios)
    const ctxDiario = document.getElementById('historialDiario').getContext('2d');
    // Gradientes para líneas
    const gradConsumo = ctxDiario.createLinearGradient(0, 0, 0, 300);
    gradConsumo.addColorStop(0, 'rgba(91,192,190,0.35)');
    gradConsumo.addColorStop(1, 'rgba(91,192,190,0.05)');
    const gradSolar = ctxDiario.createLinearGradient(0, 0, 0, 300);
    gradSolar.addColorStop(0, 'rgba(255,214,107,0.35)');
    gradSolar.addColorStop(1, 'rgba(255,214,107,0.05)');

    state.charts.diario = new Chart(ctxDiario, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => i + 'h'),
        datasets: [
          {
            label: 'Consumo (W)',
            data: datos.potencia,
            borderColor: '#5bc0be',
            backgroundColor: gradConsumo,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: '#5bc0be'
          },
          {
            label: 'Producción Solar (W)',
            data: datos.solar,
            borderColor: '#ffd66b',
            backgroundColor: gradSolar,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 4,
            pointBackgroundColor: '#ffd66b'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#9eddd6' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#9eddd6' }
          }
        }
      }
    });
    
    // Generar gráficos mensual y anual
    this.generarGraficoMensual();
    this.generarGraficoAnual();
    
    // Inicializar selectores
    Utils.inicializarSelectoresGraficos();
  },
  
  generarGraficoMensual() {
    if (!state.equipoSeleccionado) return;
    
    // Obtener o generar datos mensuales
    if (!state.datosMensuales[state.equipoSeleccionado]) {
      state.datosMensuales[state.equipoSeleccionado] = {};
    }
    if (!state.datosMensuales[state.equipoSeleccionado][state.anoSeleccionadoMensual]) {
      state.datosMensuales[state.equipoSeleccionado][state.anoSeleccionadoMensual] = {};
    }
    if (!state.datosMensuales[state.equipoSeleccionado][state.anoSeleccionadoMensual][state.mesSeleccionadoMensual]) {
      state.datosMensuales[state.equipoSeleccionado][state.anoSeleccionadoMensual][state.mesSeleccionadoMensual] = 
        Utils.generarDatosMensuales(state.equipoSeleccionado, state.anoSeleccionadoMensual, state.mesSeleccionadoMensual);
    }
    
    const monthly = state.datosMensuales[state.equipoSeleccionado][state.anoSeleccionadoMensual][state.mesSeleccionadoMensual];
    
    const ctxMensual = document.getElementById('historialMensual').getContext('2d');
    
    // Destruir gráfico existente si hay uno
    if (state.charts.mensual) {
      state.charts.mensual.destroy();
    }
    
    const gradMensual = ctxMensual.createLinearGradient(0, 0, 0, 300);
    gradMensual.addColorStop(0, 'rgba(153,102,255,0.7)');
    gradMensual.addColorStop(1, 'rgba(153,102,255,0.15)');

    state.charts.mensual = new Chart(ctxMensual, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 30 }, (_, i) => 'D' + (i + 1)),
        datasets: [{
          label: 'Producción diaria (W)',
          data: monthly,
          backgroundColor: gradMensual,
          borderColor: 'rgba(153,102,255,0.9)',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9eddd6' } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#9eddd6' },
            title: { display: true, text: 'Producción (W)', color: '#cfeff0' }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Producción Mensual - ${CONFIG.MESES_DISPONIBLES[state.mesSeleccionadoMensual].nombre} ${state.anoSeleccionadoMensual}`,
            color: '#bfeceb',
            font: { size: 14 }
          },
          legend: { display: false }
        }
      }
    });
  },
  
  generarGraficoAnual() {
    if (!state.equipoSeleccionado) return;
    
    // Obtener o generar datos anuales
    if (!state.datosAnuales[state.equipoSeleccionado]) {
      state.datosAnuales[state.equipoSeleccionado] = {};
    }
    if (!state.datosAnuales[state.equipoSeleccionado][state.anoSeleccionadoAnual]) {
      state.datosAnuales[state.equipoSeleccionado][state.anoSeleccionadoAnual] = 
        Utils.generarDatosAnuales(state.equipoSeleccionado, state.anoSeleccionadoAnual);
    }
    
    const anual = state.datosAnuales[state.equipoSeleccionado][state.anoSeleccionadoAnual];
    
    const ctxAnual = document.getElementById('historialAnual').getContext('2d');
    
    // Destruir gráfico existente si hay uno
    if (state.charts.anual) {
      state.charts.anual.destroy();
    }
    
    const gradAnual = ctxAnual.createLinearGradient(0, 0, 0, 300);
    gradAnual.addColorStop(0, 'rgba(255,159,64,0.7)');
    gradAnual.addColorStop(1, 'rgba(255,159,64,0.15)');

    state.charts.anual = new Chart(ctxAnual, {
      type: 'bar',
      data: {
        labels: CONFIG.MESES_DISPONIBLES.map(mes => mes.nombre.substring(0, 3)),
        datasets: [{
          label: 'Producción mensual (W)',
          data: anual,
          backgroundColor: gradAnual,
          borderColor: 'rgba(255,159,64,0.9)',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9eddd6' } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#9eddd6' },
            title: { display: true, text: 'Producción (W)', color: '#cfeff0' }
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Producción Anual - ${state.anoSeleccionadoAnual}`,
            color: '#bfeceb',
            font: { size: 14 }
          },
          legend: { display: false }
        }
      }
    });
  },
  
  // Función para actualizar solo el gráfico mensual
  actualizarGraficoMensual() {
    this.generarGraficoMensual();
  },
  
  // Función para actualizar solo el gráfico anual
  actualizarGraficoAnual() {
    this.generarGraficoAnual();
  }
};

// ===============================
// SIMULACIÓN
// ===============================
const SimulationManager = {
  iniciar() {
    this.detener();
    if (state.simTimer) clearInterval(state.simTimer);
    if (!state.dayData[state.equipoSeleccionado]) {
      state.dayData[state.equipoSeleccionado] = DataManager.generarDiaRealista(state.equipoSeleccionado);
    }
    state.simulatedHour = 6;
    this.actualizarLecturas();
    state.simTimer = setInterval(() => this.avanzarSimulacion(), CONFIG.TICK_MS);
  },
  detener() {
    if (state.simTimer) {
      clearInterval(state.simTimer);
      state.simTimer = null;
    }
  },
  avanzarSimulacion() {
    state.simulatedHour = (state.simulatedHour + 1) % CONFIG.DAY_HOURS;
    this.actualizarLecturas();
  },
  actualizarLecturas() {
    if (!state.equipoSeleccionado) return;
    
    // Si hay datos reales disponibles y es Equipo 1, usarlos para algunos valores
    if (state.realDataAvailable && state.lastRealData && state.equipoSeleccionado === "Equipo 1") {
      // Los datos reales ya están mostrándose via RealDataManager
      // Solo actualizamos los datos simulados complementarios
      this.actualizarDatosSimulados();
    } else {
      // Modo completamente simulado
      this.actualizarCompletamenteSimulado();
    }
    
    UIManager.actualizarResumen();
    AlertManager.chequearAlarmas();
    if (state.charts.diario) {
      state.charts.diario.update();
    }
  },
  actualizarDatosSimulados() {
    const d = state.dayData[state.equipoSeleccionado];
    const h = state.simulatedHour;
    
    // Generar datos complementarios basados en datos reales
    const datosComplementarios = RealDataManager.generarDatosComplementarios(state.lastRealData);
    
    // Actualizar solo los datos simululados
    document.getElementById('autoconsumo').textContent = datosComplementarios.autoconsumo + ' W';
    
    if (datosComplementarios.energiaRed.importada > 0) {
      document.getElementById('energiaRed').innerHTML = `<span style="color:#ffd66b">${datosComplementarios.energiaRed.importada} W</span>`;
    } else if (datosComplementarios.energiaRed.inyectada > 0) {
      document.getElementById('energiaRed').innerHTML = `<span style="color:#6ef08a">Inyectado ${datosComplementarios.energiaRed.inyectada} W</span>`;
    } else {
      document.getElementById('energiaRed').textContent = '0 W';
    }
    
    document.getElementById('temperaturaInv').textContent = datosComplementarios.temperaturaInv + ' °C';
    document.getElementById('temperaturaInv').className = 'valor ' + Utils.getColorByValue(datosComplementarios.temperaturaInv, 38, 45);
  },
  actualizarCompletamenteSimulado() {
    const d = state.dayData[state.equipoSeleccionado];
    const h = state.simulatedHour;
    
    const potencia = d.potencia[h];
    const solar = d.solar[h];
    const voltP = d.voltPanels[h];
    let autocons = d.autoconsumo[h];
    let importGrid = d.energiaImport[h];
    let injectGrid = d.energiaInject[h];
    const voltPack = d.voltBatPack[h];
    const tempInv = d.tempInv[h];
    let pct = d.bateriaPct[h];
    
    // Modelo simple de batería
    const socMax = state.socConfig.socMax;
    const dod = state.socConfig.dod;
    const net = solar - potencia;
    let batteryAction = 0;
    
    if (net > 0 && pct < socMax) {
      batteryAction = Math.min(net * 0.9, (socMax - pct) * 50);
      injectGrid = Math.max(0, injectGrid - Math.round(batteryAction));
    } else if (net < 0 && pct > dod) {
      batteryAction = -Math.min(-net * 0.85, (pct - dod) * 40);
      importGrid = Math.max(0, importGrid - Math.round(-batteryAction));
    }
    
    pct = Math.max(dod, Math.min(socMax, Utils.round(pct + batteryAction / 5000, 1)));
    
    // Actualizar UI
    document.getElementById('potencia').textContent = potencia + ' W';
    document.getElementById('produccionSolar').textContent = solar + ' W';
    document.getElementById('voltPanels').textContent = voltP + ' V';
    document.getElementById('autoconsumo').textContent = autocons + ' W';
    
    if (importGrid > 0) {
      document.getElementById('energiaRed').innerHTML = `<span style="color:#ffd66b">${importGrid} W</span>`;
    } else if (injectGrid > 0) {
      document.getElementById('energiaRed').innerHTML = `<span style="color:#6ef08a">Inyectado ${injectGrid} W</span>`;
    } else {
      document.getElementById('energiaRed').textContent = '0 W';
    }
    
    document.getElementById('voltajeBat').textContent = voltPack + ' V';
    document.getElementById('bateriaPct').textContent = pct + ' %';
    document.getElementById('bateriaPct').className = 'valor ' + Utils.getColorByValue(pct);
    document.getElementById('temperaturaInv').textContent = tempInv + ' °C';
    document.getElementById('temperaturaInv').className = 'valor ' + Utils.getColorByValue(tempInv, 38, 45);
  }
};

// ===============================
// GESTIÓN DE ALERTAS
// ===============================
const AlertManager = {
  chequearAlarmas() {
    if (!state.equipoSeleccionado) return;
    
    // Si hay datos reales y es Equipo 1, usar esos para las alarmas
    if (state.realDataAvailable && state.lastRealData && state.equipoSeleccionado === "Equipo 1") {
      this.chequearAlarmasConDatosReales(state.lastRealData);
    } else {
      this.chequearAlarmasSimuladas();
    }
  },
  chequearAlarmasConDatosReales(data) {
    let overall = 'NORMAL';
    let level = 'OK';
    
    // Verificar voltaje de batería
    const vbatCritical = data.Vbat < 42 || data.Vbat > 58; // Ejemplo para 48V system
    const vbatWarn = (data.Vbat < 46 || data.Vbat > 56);
    
    // Verificar SOC
    const socCritical = data.SOC < (state.socConfig.dod + 2);
    const socWarn = data.SOC < (state.socConfig.dod + 8);
    
    // Verificar temperatura (simulada)
    const tempCritical = false; // No tenemos datos reales de temperatura
    const tempWarn = false;
    
    // Verificar producción solar
    const solarWarn = data.Ppv < 10; // Poca producción
    
    // Verificar celdas (simulado)
    const cellCritical = false;
    const cellWarn = false;
    
    // Decide severity
    if (cellCritical || tempCritical || socCritical || vbatCritical) {
      overall = 'CRÍTICO';
      level='CRIT';
    } else if (cellWarn || tempWarn || socWarn || solarWarn || vbatWarn) {
      overall='ADVERTENCIA';
      level='WARN';
    } else {
      overall='NORMAL';
      level='OK';
    }
    
    this.actualizarAlertas({ cellCritical, cellWarn, tempCritical, tempWarn, socCritical, socWarn, solarWarn, vbatCritical, vbatWarn, overall, level });
  },
  chequearAlarmasSimuladas() {
    const d = state.dayData[state.equipoSeleccionado];
    const h = state.simulatedHour;
    
    let cellCritical = false, cellWarn = false;
    for (let c = 0; c < 16; c++) {
      const v = d.voltCells[c][h];
      if (v < 3.0 || v > 3.65) cellCritical = true;
      if (v < 3.1 || v > 3.6) cellWarn = true;
    }
    
    const temp = d.tempInv[h];
    const tempCritical = temp > 55;
    const tempWarn = temp > 45 && temp <= 55;
    
    const soc = d.bateriaPct[h];
    const socWarn = soc < (state.socConfig.dod + 8);
    const socCritical = soc < (state.socConfig.dod + 2);
    
    const solarDuringDay = d.solar.slice(10, 17).some(v => v > 10);
    const solarWarn = !solarDuringDay;
    
    let overall = 'NORMAL';
    let level = 'OK';
    
    if (cellCritical || tempCritical || socCritical) {
      overall = 'CRÍTICO';
      level = 'CRIT';
    } else if (cellWarn || tempWarn || socWarn || solarWarn) {
      overall = 'ADVERTENCIA';
      level = 'WARN';
    } else {
      overall = 'NORMAL';
      level = 'OK';
    }
    
    this.actualizarAlertas({ cellCritical, cellWarn, tempCritical, tempWarn, socCritical, socWarn, solarWarn, overall, level });
  },
  determinarEstadoGeneral() {
    if (!state.equipoSeleccionado) return 'NORMAL';
    
    // Si hay datos reales y es Equipo 1, usar esos para determinar estado
    if (state.realDataAvailable && state.lastRealData && state.equipoSeleccionado === "Equipo 1") {
      const data = state.lastRealData;
      const vbatCritical = data.Vbat < 42 || data.Vbat > 58;
      const vbatWarn = (data.Vbat < 46 || data.Vbat > 56);
      const socCritical = data.SOC < (state.socConfig.dod + 2);
      const socWarn = data.SOC < (state.socConfig.dod + 8);
      const solarWarn = data.Ppv < 10;
      
      if (vbatCritical || socCritical) return 'CRÍTICO';
      if (vbatWarn || socWarn || solarWarn) return 'ADVERTENCIA';
      return 'NORMAL';
    } else {
      // Para equipos simulados
      const d = state.dayData[state.equipoSeleccionado];
      const h = state.simulatedHour;
      
      for (let c = 0; c < 16; c++) {
        const v = d.voltCells[c][h];
        if (v < 3.0 || v > 3.65) return 'CRÍTICO';
      }
      if (d.tempInv[h] > 55) return 'CRÍTICO';
      if (d.bateriaPct[h] < state.socConfig.dod + 2) return 'CRÍTICO';
      
      if (d.tempInv[h] > 45) return 'ADVERTENCIA';
      if (d.bateriaPct[h] < state.socConfig.dod + 8) return 'ADVERTENCIA';
      
      const solarDuringDay = d.solar.slice(10, 17).some(v => v > 10);
      if (!solarDuringDay) return 'ADVERTENCIA';
      
      return 'NORMAL';
    }
  },
  actualizarAlertas(alertas) {
    const getDotAndText = (condCritical, condWarn, okText, warnText, critText) => {
      if (condCritical) return { dot: 'red', text: critText };
      if (condWarn) return { dot: 'amber', text: warnText };
      return { dot: 'green', text: okText };
    };
    
    const cRes = getDotAndText(alertas.cellCritical, alertas.cellWarn, 'Celdas OK', 'Celdas desbalanceadas', 'Celdas FUERA RANGO');
    document.getElementById('cellAlertDot').className = 'dot ' + cRes.dot;
    document.getElementById('cellAlertText').textContent = cRes.text;
    
    const tRes = getDotAndText(alertas.tempCritical, alertas.tempWarn, 'Temp OK', 'Temp alta', 'Temp crítica');
    document.getElementById('tempAlertDot').className = 'dot ' + tRes.dot;
    document.getElementById('tempAlertText').textContent = tRes.text;
    
    const sRes = getDotAndText(alertas.socCritical, alertas.socWarn, 'SOC OK', 'SOC bajo', 'SOC crítico');
    document.getElementById('socAlertDot').className = 'dot ' + sRes.dot;
    document.getElementById('socAlertText').textContent = sRes.text;
    
    const soRes = getDotAndText(false, alertas.solarWarn, 'Solar OK', 'Poca producción', 'Sin producción');
    document.getElementById('solarAlertDot').className = 'dot ' + soRes.dot;
    document.getElementById('solarAlertText').textContent = soRes.text;
    
    document.getElementById('alertOverallDot').className = 'dot ' + (alertas.level === 'CRIT' ? 'red' : alertas.level === 'WARN' ? 'amber' : 'green');
    document.getElementById('alertOverallText').textContent = alertas.overall;
  }
};

// ===============================
// GESTIÓN DE EQUIPOS Y CLIENTES
// ===============================
const EquipoManager = {
  agregarEquipo(formData) {
    const nuevoEquipo = {
      activo: formData.estadoInicial === 'activo',
      credito: parseInt(formData.creditoInicial),
      consumoBase: parseFloat(formData.consumoBase),
      tipoSistema: formData.tipoSistema,
      capacidadBateria: parseFloat(formData.capacidadBateria),
      cliente: {
        numero: formData.numeroCliente,
        nombre: formData.nombreCliente,
        rut: formData.rutCliente,
        email: formData.emailCliente,
        telefono: formData.telefonoCliente,
        direccion: formData.direccionCliente,
        lat: formData.latCliente || '',
        lng: formData.lngCliente || ''
      }
    };
    
    state.equipos[formData.nombreEquipo] = nuevoEquipo;
    DataManager.persistirDatos();
    
    // Generar datos del día para el nuevo equipo
    state.dayData[formData.nombreEquipo] = DataManager.generarDiaRealista(formData.nombreEquipo);
    
    UIManager.mostrarSelector();
    UIManager.actualizarAlertasPanel();
    return true;
  },
  procesarFormulario(event) {
    event.preventDefault();

    const formData = {
      nombreEquipo: document.getElementById('nombreEquipo').value,
      consumoBase: document.getElementById('consumoBase').value,
      tipoSistema: document.getElementById('tipoSistema').value,
      capacidadBateria: document.getElementById('capacidadBateria').value,
      numeroCliente: document.getElementById('numeroCliente').value,
      nombreCliente: document.getElementById('nombreCliente').value,
      rutCliente: document.getElementById('rutCliente').value,
      emailCliente: document.getElementById('emailCliente').value,
      telefonoCliente: document.getElementById('telefonoCliente').value,
      direccionCliente: document.getElementById('direccionCliente').value,
      latCliente: document.getElementById('latCliente').value,
      lngCliente: document.getElementById('lngCliente').value,
      creditoInicial: document.getElementById('creditoInicial').value,
      estadoInicial: document.getElementById('estadoInicial').value
    };

    // Validaciones básicas
    if (!formData.nombreEquipo || !formData.nombreCliente || !formData.rutCliente || !formData.direccionCliente) {
      alert('Por favor complete todos los campos obligatorios (*)');
      return;
    }

    // Permitir edición si el nombre del equipo ya existe y el campo está en modo solo lectura (edición)
    const nombreEquipoInput = document.getElementById('nombreEquipo');
    if (state.equipos[formData.nombreEquipo] && !nombreEquipoInput.readOnly) {
      alert('Ya existe un equipo con ese nombre. Por favor elija otro nombre.');
      return;
    }

    if (this.agregarEquipo(formData)) {
      UIManager.ocultarFormularioAgregar();
      alert(`✅ Equipo "${formData.nombreEquipo}" agregado correctamente para el cliente ${formData.nombreCliente}.`);
    }
  }
};

// ===============================
// FUNCIONES GLOBALES
// ===============================
function abrirDashboard(equipo) {
  state.equipoSeleccionado = equipo;
  const datosEquipo = state.equipos[equipo];
  document.getElementById('alertBar').style.display = 'none';
  
  // Actualizar información del equipo
  UIManager.actualizarInfoSuscripcion();
  
  document.getElementById('tituloEquipo').textContent = equipo;
  
  // Mostrar información del cliente
  UIManager.mostrarInformacionCliente(equipo);
  
  // Ocultar elementos de la página principal
  document.getElementById('selector').style.display = 'none';
  document.getElementById('searchBar').style.display = 'none';
  document.getElementById('alertasPanel').style.display = 'none';
  document.getElementById('addEquipoBtn').parentElement.style.display = 'none';
  
  // Mostrar dashboard
  document.getElementById('dashboard').style.display = 'block';
  
  ChartManager.generarGraficosGenerales();
  
  // Iniciar monitoreo de datos reales solo para Equipo 1
  RealDataManager.iniciarMonitoreo();
  // También iniciar simulación para datos complementarios
  SimulationManager.iniciar();
}

function volver() {
  // Ocultar dashboard
  document.getElementById('dashboard').style.display = 'none';

  // Ocultar mini-mapa si existe
  const miniMapDiv = document.getElementById('miniMap');
  if (miniMapDiv) {
    miniMapDiv.style.display = 'none';
  }
  if (window._miniMapInstance) {
    window._miniMapInstance.remove();
    window._miniMapInstance = null;
  }

  // Mostrar elementos de la página principal
  document.getElementById('selector').style.display = 'flex';
  document.getElementById('searchBar').style.display = 'flex';
  document.getElementById('alertasPanel').style.display = 'block';
  document.getElementById('addEquipoBtn').parentElement.style.display = 'block';

  SimulationManager.detener();
  RealDataManager.detenerMonitoreo();
  UIManager.mostrarSelector();
  UIManager.actualizarAlertasPanel();
}

// ===============================
// INICIALIZACIÓN
// ===============================
function inicializar() {
  // Configuración global Chart.js (tema dark moderno)
  if (window.Chart) {
    Chart.defaults.color = '#bfeceb';
    Chart.defaults.font.family = 'Segoe UI, Roboto, Inter, sans-serif';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';
    Chart.defaults.plugins.legend.labels.color = '#cfeff0';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0,0,0,0.85)';
    Chart.defaults.plugins.tooltip.titleColor = '#e6f7f7';
    Chart.defaults.plugins.tooltip.bodyColor = '#e6f7f7';
  }
  // Inicializar datos del día para cada equipo
  Object.keys(state.equipos).forEach(equipo => {
    state.dayData[equipo] = DataManager.generarDiaRealista(equipo);
  });
  
  // Mostrar selector inicial
  UIManager.mostrarSelector();
  UIManager.actualizarAlertasPanel();
  
  // Cargar equipos extra
  DataManager.cargarEquiposExtra().forEach(equipoData => {
    if (!state.equipos[equipoData.nombreEquipo]) {
      EquipoManager.agregarEquipo(equipoData);
    }
  });
  
  // Configurar event listeners
  document.getElementById('addEquipoBtn').addEventListener('click', () => UIManager.mostrarFormularioAgregar());
  document.getElementById('closeFormModal').addEventListener('click', () => UIManager.ocultarFormularioAgregar());
  document.getElementById('cancelForm').addEventListener('click', () => UIManager.ocultarFormularioAgregar());
  document.getElementById('equipoForm').addEventListener('submit', (e) => EquipoManager.procesarFormulario(e));
  document.getElementById('volver').addEventListener('click', volver);
  
  // Configuración de suscripción
  document.getElementById('configSuscripcionBtn').addEventListener('click', () => {
    UIManager.mostrarConfiguracionSuscripcion();
  });

  document.getElementById('closeSuscripcionModal').addEventListener('click', () => {
    document.getElementById('suscripcionModal').style.display = 'none';
  });

  document.getElementById('cerrarSuscripcionBtn').addEventListener('click', () => {
    document.getElementById('suscripcionModal').style.display = 'none';
  });

  // --- Cambios aquí: controles de días dinámicos ---
  // Reemplaza los botones +5/-5 por controles dinámicos
  const agregarDiasInput = document.createElement('input');
  agregarDiasInput.type = 'number';
  agregarDiasInput.id = 'agregarDiasInput';
  agregarDiasInput.min = '1';
  agregarDiasInput.value = '1';
  agregarDiasInput.style.width = '60px';
  agregarDiasInput.style.marginRight = '8px';

  // Insertar el input antes del botón de agregar días
  const suscripcionControls = document.querySelector('.suscripcion-controls');
  if (suscripcionControls) {
    // Elimina los botones antiguos si existen
    const btnAgregar = document.getElementById('agregarCreditoBtn');
    const btnQuitar = document.getElementById('quitarCreditoBtn');
    if (btnAgregar && btnQuitar) {
      btnAgregar.textContent = '+ días';
      btnAgregar.id = 'agregarCreditoBtnNuevo';
      btnQuitar.textContent = '- días';
      btnQuitar.id = 'quitarCreditoBtnNuevo';
      suscripcionControls.insertBefore(agregarDiasInput, btnAgregar);
    }
  }

  document.getElementById('agregarCreditoBtnNuevo').addEventListener('click', () => {
    if (!state.equipoSeleccionado) return alert('Selecciona un equipo');
    const dias = parseInt(document.getElementById('agregarDiasInput').value) || 1;
    if (dias < 1) return alert('Debes ingresar al menos 1 día.');
    state.equipos[state.equipoSeleccionado].credito += dias;
    DataManager.persistirDatos();
    UIManager.actualizarInfoSuscripcion();
    UIManager.mostrarConfiguracionSuscripcion();
    UIManager.mostrarSelector();
    UIManager.actualizarAlertasPanel();
  });

  document.getElementById('quitarCreditoBtnNuevo').addEventListener('click', () => {
    if (!state.equipoSeleccionado) return alert('Selecciona un equipo');
    const dias = parseInt(document.getElementById('agregarDiasInput').value) || 1;
    if (dias < 1) return alert('Debes ingresar al menos 1 día.');
    if (state.equipos[state.equipoSeleccionado].credito <= 1) {
      alert('No se pueden quitar más días. El crédito mínimo es 0.');
      return;
    }
    state.equipos[state.equipoSeleccionado].credito -= dias;
    if (state.equipos[state.equipoSeleccionado].credito < 0) {
      state.equipos[state.equipoSeleccionado].credito = 0;
    }
    DataManager.persistirDatos();
    UIManager.actualizarInfoSuscripcion();
    UIManager.mostrarConfiguracionSuscripcion();
    UIManager.mostrarSelector();
    UIManager.actualizarAlertasPanel();
  });

  // Event listeners para gráficos flotantes
  document.querySelectorAll('.dato[data-type]').forEach(card => {
    card.addEventListener('click', (e) => {
      // Evitar que se active si se hace clic en la configuración de batería o en el botón de configuración
      if (e.target.closest('.battery-config') || e.target.id === 'batteryConfigToggle') return;
      
      const tipo = card.getAttribute('data-type');
      const titulo = card.querySelector('h3').textContent;
      UIManager.mostrarGraficoFlotante(tipo, titulo);
    });
  });
  
  // Cerrar modal de gráfico flotante

  document.getElementById('closeFloatingChartModal').addEventListener('click', () => {
    document.getElementById('floatingChartModal').style.display = 'none';
    if (state.floatingChart) {
      state.floatingChart.destroy();
      state.floatingChart = null;
    }
  });
  
  // Configuración SOC en tarjeta de batería - Usando el botón de engranaje
  document.getElementById('batteryConfigToggle').addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar que se abra el gráfico flotante
    UIManager.toggleConfiguracionBateria();
  });
  
  // Guardar configuración SOC

  document.getElementById('guardarSOCCard').addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar que se abra el gráfico flotante
    UIManager.guardarConfiguracionSOC();
  });
  
  // Botón para ver resumen del día
  document.getElementById('btnVerResumen').addEventListener('click', () => {
    if (!state.equipoSeleccionado) return alert('Selecciona un equipo');
    const d = state.dayData[state.equipoSeleccionado];
    const consumed = d.potencia.reduce((a,b)=>a+b,0)/1000;
    const solar = d.solar.reduce((a,b)=>a+b,0)/1000;
    const imported = d.energiaImport.reduce((a,b)=>a+b,0)/1000;
    const injected = d.energiaInject.reduce((a,b)=>a+b,0)/1000;
    const autocons = d.autoconsumo.reduce((a,b)=>a+b,0)/1000;
    
    const html = `
      <div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--accent);">Resumen Energético del Día</h3>
        <p>Para el equipo: <strong>${state.equipoSeleccionado}</strong></p>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin:20px 0;">
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; text-align:center;">
          <h4 style="color:#5bc0be; margin:0 0 10px 0;">Consumo Total</h4>
          <div style="font-size:1.8rem; font-weight:bold;">${Utils.round(consumed, 2)} kWh</div>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; text-align:center;">
          <h4 style="color:#ffd66b; margin:0 0 10px 0;">Generación Solar</h4>
          <div style="font-size:1.8rem; font-weight:bold;">${Utils.round(solar, 2)} kWh</div>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; text-align:center;">
          <h4 style="color:#ff6b6b; margin:0 0 10px 0;">Importada de Red</h4>
          <div style="font-size:1.8rem; font-weight:bold;">${Utils.round(imported, 2)} kWh</div>
        </div>
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:10px; text-align:center;">
          <h4 style="color:#6ef08a; margin:0 0 10px 0;">Inyectada a Red</h4>
          <div style="font-size:1.8rem; font-weight:bold;">${Utils.round(injected, 2)} kWh</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:10px; margin-top:20px;">
        <h4 style="color:var(--accent); margin-top:0;">Eficiencia del Sistema</h4>
        <p><strong>Autoconsumo:</strong> ${Utils.round(autocons, 2)} kWh (${Utils.round((autocons/solar)*100, 1)}% de la generación solar)</p>
        <p><strong>Autosuficiencia:</strong> ${Utils.round((1 - imported/consumed)*100, 1)}% del consumo cubierto por recursos propios</p>
      </div>
    `;
    
    document.getElementById('modalTitle').textContent = 'Resumen del Día - Detalle';
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = '<small>Datos basados en simulación de 24 horas</small>';
    document.getElementById('overlay').style.display = 'flex';
  });
  
  // Cerrar modal
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'none';
  });
  
  // Event listeners para la barra de búsqueda
  document.getElementById('searchInput').addEventListener('input', () => {
    UIManager.manejarBusqueda();
  });
  
  document.getElementById('searchClear').addEventListener('click', () => {
    UIManager.limpiarBusqueda();
  });
  
  // Event listener para el panel de alertas colapsable
  document.getElementById('alertasHeader').addEventListener('click', () => {
    UIManager.toggleAlertasPanel();
  });
  
  // Event listener para cerrar alerta de conexión
  document.getElementById('conexionAlertClose').addEventListener('click', () => {
    Utils.ocultarAlertaConexion();
  });
  
  // Guardar al cerrar
  window.addEventListener('beforeunload', () => DataManager.persistirDatos());
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializar);
