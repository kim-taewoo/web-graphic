- How to pass variables (called uniforms) to the shader from JavaScript.
- How to use uniforms to change the rendering behavior.
- How to use instancing to draw many different variants of the same geometry.

# Grid 를 어떻게 만들어야 하는가? 

이전 챕터에서 만든 사각형이 있으니 그걸 그냥 그리드 사이즈만큼 반복할 수도 있다. 사실 이게 뭐 나쁜 것도 아니다.
하지만 최고의 방법도 아니다. 왜냐면 그만큼 vertex buffer 가 커지기 때문에 메모리가 많이 쓰이기 때문이다. 

making your vertex buffer significantly bigger and defining GRID_SIZE times GRID_SIZE worth of squares inside it at the right size and position.

# Create a uniform buffer

First, you need to communicate the grid size you've chosen to the shader, since it uses that to change how things display. You could just hard-code the size into the shader, but then that means that any time you want to change the grid size you have to re-create the shader and render pipeline, which is expensive. A better way is to provide the grid size to the shader as uniforms.

Uniforms are a way to pass data from JavaScript to the shader. They're called uniforms because they don't change per-vertex or per-fragment, but rather are the same for all vertices or fragments.