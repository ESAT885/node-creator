import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiagramEditorComponent } from './diagram-editor/diagram-editor.component';

@Component({
  selector: 'app-root',
  imports: [/*RouterOutlet,*/DiagramEditorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'node-creator';
}
