import { Component, OnInit, OnDestroy } from '@angular/core';

interface Node {
  id: number;
  x: number;
  y: number;
  ox: number; // original x
  oy: number; // original y
  size: number;
  delay: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

@Component({
  selector: 'app-atlas-animation',
  standalone: true,
  templateUrl: './atlas-animation.html',
})
export class AtlasAnimationComponent implements OnInit, OnDestroy {
  nodes: Node[] = [];
  branches: string[] = [];
  particles: Particle[] = [];
  private adaptationInterval: any;

  ngOnInit() {
    this.generateNetwork();
    this.generateParticles();
    this.startAdaptation();
  }

  ngOnDestroy() {
    if (this.adaptationInterval) {
      clearInterval(this.adaptationInterval);
    }
  }

  generateNetwork() {
    const nodeCount = 14;
    const centerX = 400;
    const centerY = 300;

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2 + (Math.random() * 0.4);
      const distance = 160 + Math.random() * 120;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      this.nodes.push({
        id: i,
        x,
        y,
        ox: x,
        oy: y,
        size: 4 + Math.random() * 4,
        delay: Math.random() * 3000
      });
    }
    this.updateBranches();
  }

  generateParticles() {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        id: i,
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: 1 + Math.random() * 2,
        duration: 10 + Math.random() * 15,
        delay: Math.random() * -20
      });
    }
  }

  startAdaptation() {
    this.adaptationInterval = setInterval(() => {
      // Slightly shift nodes to simulate "living" adaptation
      this.nodes.forEach(node => {
        const drift = 15;
        node.x = node.ox + (Math.random() - 0.5) * drift;
        node.y = node.oy + (Math.random() - 0.5) * drift;
      });
      this.updateBranches();
    }, 4000);
  }

  updateBranches() {
    const centerX = 400;
    const centerY = 300;
    const newBranches: string[] = [];

    this.nodes.forEach(node => {
      const angle = Math.atan2(node.y - centerY, node.x - centerX);
      const distance = Math.sqrt(Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2));
      
      const cp1x = centerX + Math.cos(angle) * (distance * 0.35) + (Math.random() - 0.5) * 40;
      const cp1y = centerY + Math.sin(angle) * (distance * 0.35) + (Math.random() - 0.5) * 40;
      const cp2x = centerX + Math.cos(angle) * (distance * 0.75) + (Math.random() - 0.5) * 40;
      const cp2y = centerY + Math.sin(angle) * (distance * 0.75) + (Math.random() - 0.5) * 40;
      
      newBranches.push(`M ${centerX} ${centerY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${node.x} ${node.y}`);
    });
    this.branches = newBranches;
  }
}
