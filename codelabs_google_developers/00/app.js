const canvas = document.querySelector("canvas")

if (!navigator.gpu) {
  throw new Error("WebGPU not supported on this browser.")
}

const adapter = await navigator.gpu.requestAdapter()

// 적절한 어댑터를 찾을 수 없으면 반환된 adapter 값이 null일 수 있으므로 이 가능성을 처리해야 합니다. 이는 사용자의 브라우저가 WebGPU를 지원하지만 GPU 하드웨어에 WebGPU를 사용하는 데 필요한 모든 기능이 없는 경우 발생할 수 있습니다.
if (!adapter) {
  throw new Error("No appropriate GPUAdapter found.")
}

// 어댑터가 있는 경우 GPU 작업을 시작하기 위한 마지막 단계는 GPUDevice를 요청하는 것입니다. 기기는 GPU와의 대부분의 상호작용이 발생하는 기본 인터페이스입니다.
const device = await adapter.requestDevice()

// 이렇게 하려면 먼저 canvas.getContext("webgpu")를 호출하여 캔버스에서 GPUCanvasContext를 요청합니다. (이는 각각 2d 및 webgl 컨텍스트 유형을 사용하여 Canvas 2D 또는 WebGL 컨텍스트를 초기화하는 데 사용하는 것과 동일합니다.) 그런 다음 반환하는 context는 다음과 같이 configure() 메서드를 사용하여 기기와 연결해야 합니다.
const context = canvas.getContext("webgpu")
const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
context.configure({
  device: device,
  format: canvasFormat,
})

// 가장 중요한 옵션은 컨텍스트를 사용할 device 및 컨텍스트에서 사용해야 하는 텍스처 형식인 format입니다.

// Textures are the objects that WebGPU uses to store image data, and each texture has a format that lets the GPU know how that data is laid out in memory.
// 텍스처는 WebGPU가 이미지 데이터를 저장하는 데 사용하는 객체이며, 각 텍스처에는 해당 데이터가 메모리에 배치되는 방식을 GPU에 알리는 형식이 있습니다. 텍스처 메모리의 작동 방식에 관한 자세한 내용은 이 Codelab의 범위를 벗어납니다. 캔버스 컨텍스트는 코드로 그릴 수 있는 텍스처를 제공하므로 사용하는 형식이 캔버스의 이미지 효율에 영향을 줄 수 있습니다. 기기 유형에 따라 텍스처 형식이 다를 때 성능이 가장 우수하며, 기기의 기본 형식을 사용하지 않으면 이미지가 페이지의 일부로 표시되기 전에 백그라운드에서 추가 메모리 사본이 생성될 수 있습니다.

// 다행히도 걱정할 필요가 없습니다. WebGPU에서 캔버스에 사용할 형식을 알려주기 때문입니다. 대부분의 경우 위와 같이 navigator.gpu.getPreferredCanvasFormat()를 호출하여 반환된 값을 전달하려고 합니다.

// have the device create a GPUCommandEncoder, which provides an interface for recording GPU commands.
const encoder = device.createCommandEncoder()

// The commands you want to send to the GPU are related to rendering (in this case, clearing the canvas), so the next step is to use the encoder to begin a Render Pass.

// Render passes are when all drawing operations in WebGPU happen. Each one starts off with a beginRenderPass() call, which defines the textures that receive the output of any drawing commands performed. More advanced uses can provide several textures, called attachments, with various purposes such as storing the depth of rendered geometry or providing antialiasing. For this app, however, you only need one.

const pass = encoder.beginRenderPass({
  colorAttachments: [
    {
      view: context.getCurrentTexture().createView(),
      // Passing [0, 0.5, 0.7, 1] is the same as passing { r: 0, g: 0.5, b: 0.7, a: 1 }.
      // clear 할 때 어떤 색으로 해줄지 설정
      clearValue: { r: 0, g: 0.5, b: 0.7, a: 1 },
      loadOp: "clear",
      storeOp: "store",
    },
  ],
})

// The texture is given as the view property of a colorAttachment. Render passes require that you provide a GPUTextureView instead of a GPUTexture, which tells it which parts of the texture to render to. This only really matters for more advanced use cases, so here you call createView() with no arguments on the texture, indicating that you want the render pass to use the entire texture.

// You also have to specify what you want the render pass to do with the texture when it starts and when it ends:

// A loadOp value of "clear" indicates that you want the texture to be cleared when the render pass starts.
// A storeOp value of "store" indicates that once the render pass is finished you want the results of any drawing done during the render pass saved into the texture.

// Once the render pass has begun you do... nothing! At least for now. The act of starting the render pass with loadOp: "clear" is enough to clear the texture view and the canvas.
// End the render pass by adding the following call immediately after beginRenderPass():
pass.end()

// It's important to know that simply making these calls does not cause the GPU to actually do anything. They're just recording commands for the GPU to do later.

// In order to create a GPUCommandBuffer, call finish() on the command encoder. The command buffer is an opaque handle to the recorded commands.

// const commandBuffer = encoder.finish()

// device.queue.submit([commandBuffer])

// Finish the command buffer and immediately submit it.
device.queue.submit([encoder.finish()])

const vertexBuffer = device.createBuffer({
  label: "Cell vertices",
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
})
