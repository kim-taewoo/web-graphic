

https://codelabs.developers.google.com/your-first-webgpu-app?hl=ko#0

> ! 스크립트 태그에 "module" 유형을 지정하면 WebGPU 초기화에 유용한 최상위 Awaits를 사용할 수 있습니다.

앱의 WebGPU를 초기화하는 첫 번째 단계로 GPUAdapter를 요청해야 합니다. 어댑터는 기기의 특정 GPU 하드웨어를 WebGPU가 표현한 것이라고 생각하면 됩니다.

어댑터를 가져오려면 navigator.gpu.requestAdapter() 메서드를 사용합니다. 프로미스를 반환하므로 await로 호출하는 것이 가장 편리합니다.

# Textures

Textures are the objects that WebGPU uses to store image data, and each texture has a format that lets the GPU know how that data is laid out in memory.

# render 순서

## 1. Render passes

Render passes are when all drawing operations in WebGPU happen. Each one starts off with a beginRenderPass() call, which defines the textures that receive the output of any drawing commands performed. More advanced uses can provide several textures, called attachments, with various purposes such as storing the depth of rendered geometry or providing antialiasing. For this app, however, you only need one.

Once the render pass has begun you do... nothing! At least for now. The act of starting the render pass with loadOp: "clear" is enough to clear the texture view and the canvas.
End the render pass by adding the following call immediately after beginRenderPass():

> It's important to know that simply making these calls does not cause the GPU to actually do anything. They're just recording commands for the GPU to do later.

## 2. render passes 로 저장된 명령어들을 command buffer 로 만들고 그것을 기기(GPU) 에 전달해서 그리기 시작

// In order to create a GPUCommandBuffer, call finish() on the command encoder. The command buffer is an opaque handle to the recorded commands.

```js
// const commandBuffer = encoder.finish()

// device.queue.submit([commandBuffer])

// 보통 위 두 개를 합쳐서 진행한다.
// Finish the command buffer and immediately submit it.
device.queue.submit([encoder.finish()])
```

# Clip Space

No matter how wide or tall your canvas is, the left edge is always at -1 on the X axis, and the right edge is always at +1 on the X axis. Similarly, the bottom edge is always -1 on the Y axis, and the top edge is +1 on the Y axis. That means that (0, 0) is always the center of the canvas, (-1, -1) is always the bottom-left corner, and (1, 1) is always the top-right corner. This is known as Clip Space.

# Shaders

The vertices are rarely defined in this coordinate system initially, so GPUs rely on small programs called vertex shaders to perform whatever math is necessary to transform the vertices into clip space, as well as any other calculations needed to draw the vertices. For example, the shader may apply some animation or calculate the direction from the vertex to a light source. These shaders are written by you, the WebGPU developer, and they provide an amazing amount of control over how the GPU works.

From there, the GPU takes all the triangles made up by these transformed vertices and determines which pixels on the screen are needed to draw them. Then it runs another small program you write called a fragment shader that calculates what color each pixel should be. That calculation can be as simple as return green or as complex as calculating the angle of the surface relative to sunlight bouncing off of other nearby surfaces, filtered through fog, and modified by how metallic the surface is. It's entirely under your control, which can be both empowering and overwhelming.

# 2D vs 3D

Note: This codelab is only going to be dealing with 2D shapes, but this process still applies to 3D content, too! What's the difference between 2D and 3D according to the GPU? Just a bit of extra math! 3D content typically uses a series of matrices to transform the positions in a vertex shader (which is covered soon) prior to drawing the triangles in order to give the perception of depth and volume—but in the end almost everything the GPU draws is just triangles in clip space.

# TypedArray (JS)

In order to feed those coordinates to the GPU, you need to place the values in a TypedArray. If you're not familiar with it already, TypedArrays are a group of JavaScript objects that allows you to allocate contiguous blocks of memory and interpret each element in the series as a specific data type. For example, in a Uint8Array, each element in the array is a single, unsigned byte. TypedArrays are great for sending data back and forth with APIs that are sensitive to memory layout, like WebAssembly, WebAudio, and (of course) WebGPU.

For the square example, because the values are fractional, a Float32Array is appropriate.
s
Create an array that holds all of the vertex positions in the diagram by placing the following array declaration in your code. A good place to put it is near the top, just under the context.configure() call.

```js
const vertices = new Float32Array([
//   X,    Y,
  -0.8, -0.8,
   0.8, -0.8,
   0.8,  0.8,
  -0.8,  0.8,
]);
```

```js
const vertices = new Float32Array([
//   X,    Y
  -0.8, -0.8, // Triangle 1 (Blue)
   0.8, -0.8,
   0.8,  0.8,

  -0.8, -0.8, // Triangle 2 (Red)
   0.8,  0.8,
  -0.8,  0.8,
]);
```

# 꼭 삼각형을 위해 중복되는 점을 쓸 필요는 없다. 다만 인덱스 버퍼를 사용해야 한다.
Note: You don't have to repeat the vertex data in order to make triangles. Using something called Index Buffers, you can feed a separate list of values to the GPU that tells it what vertices to connect together into triangles so that they don't need to be duplicated. It's like connect-the-dots! Because your vertex data is so simple, using Index Buffers is out of scope for this Codelab. But they're definitely something that you might want to make use of for more complex geometry.

# Create a vertex buffer
The GPU cannot draw vertices with data from a JavaScript array. GPUs frequently have their own memory that is highly optimized for rendering, and so any data you want the GPU to use while it draws needs to be placed in that memory.

For a lot of values, including vertex data, the GPU-side memory is managed through GPUBuffer objects. A buffer is a block of memory that's easily accessible to the GPU and flagged for certain purposes. You can think of it a little bit like a GPU-visible TypedArray.

# Start with shaders
Now you have the data you want to render, but you still need to tell the GPU exactly how to process it. A large part of that happens with shaders.

Shaders are small programs that you write and that execute on your GPU. Each shader operates on a different stage of the data: Vertex processing, Fragment processing, or general Compute. Because they're on the GPU, they are structured more rigidly than your average JavaScript. But that structure allows them to execute very fast and, crucially, in parallel!

Shaders in WebGPU are written in a shading language called WGSL (WebGPU Shading Language). WGSL is, syntactically, a bit like Rust, with features aimed at making common types of GPU work (like vector and matrix math) easier and faster. Teaching the entirety of the shading language is well beyond the scope of this codelab, but hopefully you'll pick up some of the basics as you walk through some simple examples.

The shaders themselves get passed into WebGPU as strings.

```js
const cellShaderModule = device.createShaderModule({
  label: "Cell shader",
  code: `
    // Your shader code will go here
  `
});

```

# Define the vertex shader
Start with the vertex shader because that's where the GPU starts, too!

A vertex shader is defined as a function, and the GPU calls that function once for every vertex in your vertexBuffer. Since your vertexBuffer has six positions (vertices) in it, the function you define gets called six times. Each time it is called, a different position from the vertexBuffer is passed to the function as an argument, and it's the job of the vertex shader function to return a corresponding position in clip space.

It's important to understand that they won't necessarily get called in sequential order, either. Instead, GPUs excel at running shaders like these in parallel, potentially processing hundreds (or even thousands!) of vertices at the same time! This is a huge part of what's responsible for GPUs incredible speed, but it comes with limitations. In order to ensure extreme parallelization, vertex shaders cannot communicate with each other. Each shader invocation can only see data for a single vertex at a time, and is only able to output values for a single vertex.

In WGSL, a vertex shader function can be named whatever you want, but it must have the @vertex attribute in front of it in order to indicate which shader stage it represents. WGSL denotes functions with the fn keyword, uses parentheses to declare any arguments, and uses curly braces to define the scope.

# vec4f (x,y,z,w)
Of course, if the function has a return type, you need to actually return a value in the function body. You can construct a new vec4f to return, using the syntax vec4f(x, y, z, w). The x, y, and z values are all floating point numbers that, in the return value, indicate where the vertex lies in clip space.

Note: So what's w? The w value is the fourth component of a three-dimensional homogeneous vertex. Confused? That's OK! You don't have to worry about it much.

In practical terms, having the w value there makes math with 4x4 matrices work, which is something that you do a lot of when rendering 3D graphics, but it's rare that you need to manipulate it directly. You want to just leave it as 1 for this codelab.

# Define the fragment shader
Next up is the fragment shader. Fragment shaders operate in a very similar way to vertex shaders, but rather than being invoked for every vertex, they're invoked for every pixel being drawn.

**Fragment shaders are always called after vertex shaders.** The GPU takes the output of the vertex shaders and triangulates it, creating triangles out of sets of three points. It then rasterizes each of those triangles by figuring out which pixels of the output color attachments are included in that triangle, and then calls the fragment shader once for each of those pixels. The fragment shader returns a color, typically calculated from values sent to it from the vertex shader and assets like textures, which the GPU writes to the color attachment.

# Create a render pipeline
A shader module can't be used for rendering on its own. Instead, you have to use it as part of a GPURenderPipeline, created by calling device.createRenderPipeline(). The render pipeline controls how geometry is drawn, including things like which shaders are used, how to interpret data in vertex buffers, which kind of geometry should be rendered (lines, points, triangles...), and more!

The render pipeline is the most complex object in the entire API, but don't worry! Most of the values you can pass to it are optional, and you only need to provide a few to start.

Create a render pipeline, like this:


