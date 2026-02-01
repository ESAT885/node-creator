
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, AfterViewInit, OnInit } from '@angular/core';

@Component({
  selector: 'app-diagram-editor',
  imports: [CommonModule],
  templateUrl: './diagram-editor.component.html',
  styleUrl: './diagram-editor.component.scss'
})
export class DiagramEditorComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('svgCanvas', { static: true }) svgRef!: ElementRef<SVGElement>;

  theme: 'dark' | 'light' = 'dark';
  nodes: Node[] = [];
  edges: Edge[] = [];
  modeConnect = false;
  connectingFrom: Node | null = null;
  selectedNode: Node | null = null;
  draggingNode: Node | null = null;

  canvasWidth = 0;
  canvasHeight = 0;

  private dragStartX = 0;
  private dragStartY = 0;
  private nodeStartX = 0;
  private nodeStartY = 0;

  ngOnInit(): void {
    this.updateCanvasSize();
    this.initializeDefaultNodes();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateCanvasSize();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedNode) {
      this.removeNode(this.selectedNode);
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.draggingNode) {
      console.log(this.draggingNode)
      const dx = event.clientX - this.dragStartX;
      const dy = event.clientY - this.dragStartY;
      this.draggingNode.x = Math.max(0, this.nodeStartX + dx);
      this.draggingNode.y = Math.max(0, this.nodeStartY + dy);
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.draggingNode = null;
  }

  updateCanvasSize(): void {
    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      this.canvasWidth = canvas.clientWidth;
      this.canvasHeight = canvas.clientHeight;
    }
  }

  initializeDefaultNodes(): void {
    this.createNode(60, 80, 'Başla');
    this.createNode(320, 160, 'Bitiş');
  }

  uid(prefix = 'n'): string {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  createNode(x: number, y: number, label?: string): Node {
    const node: Node = {
      id: this.uid('node_'),
      x,
      y,
      label: label || 'Düğüm'
    };
    this.nodes.push(node);
    return node;
  }

  onNodeMouseDown(event: MouseEvent, node: Node): void {
    if (event.button !== 0) return;
    event.stopPropagation();

    this.draggingNode = node;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.nodeStartX = node.x;
    this.nodeStartY = node.y;
  }

  onNodeClick(event: MouseEvent, node: Node): void {
    event.stopPropagation();
    this.selectNode(node);

    if (this.modeConnect) {
      this.handleConnectClick(node);
    }
  }

  onNodeDblClick(event: MouseEvent, node: Node): void {
    event.stopPropagation();
    const newLabel = prompt('Düğüm etiketi:', node.label);
    if (newLabel !== null) {
      node.label = newLabel;
    }
  }

  onCanvasDblClick(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.createNode(x - 50, y - 20);
    this.updateCanvasSize();
  }

  onCanvasClick(event: MouseEvent): void {
    this.selectNode(null);
    if (this.connectingFrom) {
      this.connectingFrom = null;
    }
  }

  selectNode(node: Node | null): void {
    this.selectedNode = node;
  }

  removeNode(node: Node): void {
    this.edges = this.edges.filter(e => e.from !== node.id && e.to !== node.id);
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    this.selectedNode = null;
  }

  toggleConnectMode(): void {
    console.log('toggleConnectMode çağrıldı, önceki mod:', this.modeConnect);
    this.modeConnect = !this.modeConnect;
    this.connectingFrom = null;
    console.log('Yeni mod:', this.modeConnect);
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
  }

  handleConnectClick(node: Node): void {
    if (!this.connectingFrom) {
      this.connectingFrom = node;
    } else if (this.connectingFrom.id === node.id) {
      this.connectingFrom = null;
    } else {
      this.edges.push({
        id: this.uid('e_'),
        from: this.connectingFrom.id,
        to: node.id
      });
      this.connectingFrom = null;
      this.modeConnect = false;
    }
  }

  getEdgePath(edge: Edge): string {
    const fromNode = this.nodes.find(n => n.id === edge.from);
    const toNode = this.nodes.find(n => n.id === edge.to);

    if (!fromNode || !toNode) return '';

    // Node genişliği ve yüksekliğini daha doğru hesapla
    const nodeWidth = 110; // min-width
    const nodeHeight = 50; // yaklaşık yükseklik
    const handleOffset = 6; // handle sağ kenarda -6px pozisyonda

    // Kaydırma miktarları
    const xOffset = 25; // Negatif = sola, Pozitif = sağa
    const yOffset = 20;  // Pozitif = aşağı, Negatif = yukarı

    // Kaynak node'un sağ handle noktası
    const ax = fromNode.x + nodeWidth + handleOffset + xOffset;
    const ay = fromNode.y + nodeHeight / 2 + yOffset;

    // Hedef node'un sol kenarı
    const bx = toNode.x - handleOffset + xOffset;
    const by = toNode.y + nodeHeight / 2 + yOffset;

    const dx = Math.max(40, Math.abs(bx - ax) / 2);
    return `M ${ax} ${ay} C ${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`;
  }

  exportJSON(): void {
    const data: DiagramData = {
      nodes: this.nodes.map(n => ({ id: n.id, label: n.label, x: n.x, y: n.y })),
      edges: this.edges
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        this.loadFromJSON(data);
      } catch (err) {
        alert('Geçersiz JSON');
      }
    };
    reader.readAsText(file);
  }

  loadFromJSON(data: DiagramData): void {
    this.nodes = [];
    this.edges = [];

    if (data.nodes) {
      data.nodes.forEach(n => this.createNode(n.x, n.y, n.label));
    }

    if (data.edges) {
      const nodeIds = new Set(this.nodes.map(n => n.id));
      data.edges.forEach(e => {
        if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
          this.edges.push({ id: this.uid('e_'), from: e.from, to: e.to });
        }
      });
    }
  }

  clearAll(): void {
    if (confirm('Hepsini silmek istediğine emin misin?')) {
      this.nodes = [];
      this.edges = [];
    }
  }
}
interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  el?: HTMLElement;
}

interface Edge {
  id: string;
  from: string;
  to: string;
}

interface DiagramData {
  nodes: Array<{ id: string; label: string; x: number; y: number }>;
  edges: Edge[];
}